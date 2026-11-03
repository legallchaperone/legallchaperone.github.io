"""A toy latent world model: encode, step forward in latent space, decode."""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.distributions import Normal, kl_divergence

PATCH = 21  # 64 x 64 image -> 3 x 3 patches (the last pixel is dropped)


class Encoder(nn.Module):
    """q_phi(z_t | o_t): an image in, a Gaussian over the latent out."""

    def __init__(self, channels=3, d=128, z_dim=32):
        super().__init__()
        self.proj = nn.Linear(channels * PATCH * PATCH, d)
        self.mix = nn.TransformerEncoderLayer(d, nhead=4, batch_first=True)
        self.head = nn.Linear(d, 2 * z_dim)

    def patchify(self, image):
        # (B, C, 64, 64) -> (B, 9, C * 21 * 21): one row per patch
        patches = image.unfold(2, PATCH, PATCH).unfold(3, PATCH, PATCH)
        patches = patches.permute(0, 2, 3, 1, 4, 5)
        return patches.flatten(1, 2).flatten(-3)

    def forward(self, image):
        tokens = self.proj(self.patchify(image))  # (B, 9, d)
        tokens = self.mix(tokens)
        mu, log_var = self.head(tokens.mean(1)).chunk(2, dim=-1)
        return Normal(mu, torch.exp(0.5 * log_var))


def sample(posterior):
    # Reparameterization: the noise is an input, so gradients reach mu and sigma.
    eps = torch.randn_like(posterior.mean)
    return posterior.mean + posterior.stddev * eps


class Dynamics(nn.Module):
    """p_theta(z_{t+1} | z_t, a_t): one step forward, entirely in latent space."""

    def __init__(self, z_dim=32, n_actions=4, d=128):
        super().__init__()
        self.embed = nn.Embedding(n_actions, d)
        self.transition = nn.Sequential(
            nn.Linear(z_dim + d, d),
            nn.SiLU(),
            nn.Linear(d, 2 * z_dim),
        )

    def forward(self, z, action):
        x = torch.cat([z, self.embed(action)], dim=-1)
        mu, log_var = self.transition(x).chunk(2, dim=-1)
        return Normal(mu, torch.exp(0.5 * log_var))  # the prior for z_{t+1}


class Decoder(nn.Module):
    """g_phi(z): a latent back to a 64 x 64 image (only needed for training)."""

    def __init__(self, z_dim=32, channels=3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(z_dim, 256 * 4 * 4),
            nn.Unflatten(1, (256, 4, 4)),
            nn.ConvTranspose2d(256, 128, 4, stride=2, padding=1),  # 8 x 8
            nn.SiLU(),
            nn.ConvTranspose2d(128, 64, 4, stride=2, padding=1),  # 16 x 16
            nn.SiLU(),
            nn.ConvTranspose2d(64, 32, 4, stride=2, padding=1),  # 32 x 32
            nn.SiLU(),
            nn.ConvTranspose2d(32, channels, 4, stride=2, padding=1),  # 64 x 64
        )

    def forward(self, z):
        return torch.sigmoid(self.net(z))


def elbo_loss(encoder, dynamics, decoder, frames, actions, beta=1.0):
    """Sequential ELBO over a clip: frames (B, T, C, 64, 64), actions (B, T)."""
    recon, kl = 0.0, 0.0
    z = sample(encoder(frames[:, 0]))
    for t in range(1, frames.shape[1]):
        posterior = encoder(frames[:, t])
        prior = dynamics(z, actions[:, t - 1])
        z = sample(posterior)
        recon = recon + F.mse_loss(decoder(z), frames[:, t], reduction="sum")
        kl = kl + kl_divergence(posterior, prior).sum()
    return (recon + beta * kl) / frames.shape[0]
