window.PHD_JOB_DATA = {
  meta: {
    collectedAt: "2026-06-10",
    scope: "US big-tech & AI-lab PhD new-grad / early-career — 12 role clusters, 19 companies",
    caveat: "Direct JD > official program page > limited access/inferred. Google DeepMind hiring is separate from Google SWE PhD track. Market moves fast; verify each JD before applying."
  },

  roleClusters: [
    {
      id: "frontier-research",
      name: "Frontier Research Scientist",
      shortName: "Frontier RS",
      problem: "Push the boundary of what AI can do—novel architectures, training methods, capabilities, or fundamental understanding.",
      phdSignals: ["First-author NeurIPS/ICML/ICLR/CVPR/ACL", "coherent research agenda", "novel algorithmic contribution", "strong theoretical or empirical foundation"],
      keywords: ["research scientist", "first-author", "foundation models", "novel algorithms", "pretraining", "research agenda"],
      fit: "Best for PhDs with top-conference work and a clear thesis area. Lab companies (OpenAI, Anthropic, DeepMind) are the primary destinations."
    },
    {
      id: "safety-alignment",
      name: "Safety & Alignment Researcher",
      shortName: "Safety/Align",
      problem: "Make AI systems honest, interpretable, and reliably aligned with human intent—at the model and system level.",
      phdSignals: ["interpretability research", "RLHF / RLAIF / reward modeling", "alignment theory", "evaluation design", "mechanistic understanding"],
      keywords: ["alignment", "interpretability", "RLHF", "Constitutional AI", "evals", "safety", "honesty", "scalable oversight"],
      fit: "Best for ML PhDs who care deeply about AI safety. Anthropic and OpenAI safety teams are the primary destinations; DeepMind has a growing alignment team."
    },
    {
      id: "applied-scientist",
      name: "Applied Research Scientist",
      shortName: "Applied Sci",
      problem: "Apply scientific modeling to improve real products—success measured by business or user metrics, not paper count.",
      phdSignals: ["experimentation", "causal / statistical modeling", "production ML", "A/B testing at scale", "business metric thinking"],
      keywords: ["applied scientist", "experiment", "production-level", "customer impact", "causal inference", "product science"],
      fit: "Best for PhDs who want modeling work tied to measurable impact. Amazon, Microsoft, and Meta are the strongest hiring companies."
    },
    {
      id: "research-engineer",
      name: "Research Engineer",
      shortName: "Research Eng",
      problem: "Turn research ideas into working, scalable systems—bridging the gap between a paper and a deployed model.",
      phdSignals: ["PyTorch/JAX", "large-scale training", "model evaluation", "systems + research fluency", "rapid prototyping"],
      keywords: ["research engineer", "training systems", "model scaling", "evals", "infrastructure", "rapid prototyping"],
      fit: "Best for PhDs who can both read papers and ship serious code. This role blurs researcher and engineer—Anthropic, OpenAI, and Scale are primary employers."
    },
    {
      id: "llm-posttraining",
      name: "LLM / Post-Training Engineer",
      shortName: "LLM Eng",
      problem: "Shape model behavior through post-training—SFT, RLHF, DPO, reward modeling, and alignment pipelines.",
      phdSignals: ["RLHF / DPO / RLAIF / GRPO", "instruction tuning", "reward modeling", "preference data", "LLM behavior evaluation"],
      keywords: ["post-training", "RLHF", "SFT", "DPO", "reward model", "instruction tuning", "alignment", "fine-tuning"],
      fit: "Best for PhDs with RL, NLP, or ML background who want to work directly on model capability and behavior. xAI, Anthropic, OpenAI, and Scale lead demand."
    },
    {
      id: "multimodal-genai",
      name: "Multimodal & GenAI Engineer",
      shortName: "Multimodal",
      problem: "Build generative and multimodal AI systems—vision-language models, diffusion, video, audio, and cross-modal reasoning.",
      phdSignals: ["vision-language models (VLM)", "diffusion models", "multimodal training", "generative modeling", "image/video/audio AI"],
      keywords: ["multimodal", "vision-language", "diffusion", "generative AI", "VLM", "image generation", "video AI", "text-to-image"],
      fit: "Best for CV, NLP, or generative modeling PhDs. Apple, Meta, Adobe, and TikTok are the strongest product-side employers; DeepMind leads on research."
    },
    {
      id: "recsys-ranking",
      name: "RecSys & Ranking Engineer",
      shortName: "RecSys",
      problem: "Build recommendation, ranking, and personalization systems that power feeds, search, ads, and content discovery at scale.",
      phdSignals: ["recommendation systems", "ranking", "collaborative filtering", "embedding models", "online learning", "A/B testing at scale"],
      keywords: ["recommendation", "ranking", "ads", "feed", "search", "content discovery", "collaborative filtering", "personalization"],
      fit: "Best for ML + data PhDs who want large-scale product impact. TikTok, Meta, Amazon, LinkedIn, Roblox, and Airbnb are the core employers."
    },
    {
      id: "ml-systems",
      name: "ML Systems & Inference Engineer",
      shortName: "ML Systems",
      problem: "Make ML models fast, efficient, and deployable—training infrastructure, inference serving, and model delivery at scale.",
      phdSignals: ["GPU / CUDA / Triton", "distributed training", "inference optimization", "latency / throughput", "quantization / pruning", "ML compilers"],
      keywords: ["inference", "GPU", "distributed training", "model serving", "quantization", "CUDA", "ML compiler", "performance"],
      fit: "Best for PhDs with systems + ML overlap—compiler, architecture, or HPC background maps directly. NVIDIA, xAI, Anthropic, OpenAI are strongest."
    },
    {
      id: "computer-vision",
      name: "Computer Vision / Perception",
      shortName: "CV/Perception",
      problem: "Build models that understand images, video, and 3D scenes—for autonomous driving, robotics, creative AI, and visual search.",
      phdSignals: ["3D scene understanding", "object detection / segmentation", "visual foundation models", "video understanding", "geometry / point clouds"],
      keywords: ["computer vision", "perception", "3D detection", "object recognition", "video", "visual foundation model", "NeRF", "point cloud"],
      fit: "Best for CV or vision-ML PhDs. Waymo, Tesla, NVIDIA, Meta, and Apple have the deepest demand."
    },
    {
      id: "robotics",
      name: "Robotics & Embodied AI",
      shortName: "Robotics",
      problem: "Connect perception, planning, control, and simulation into physical AI systems that act in the real world.",
      phdSignals: ["robot learning", "control theory", "sim-to-real", "RL / imitation learning", "manipulation", "motion planning", "VLA models"],
      keywords: ["robotics", "embodied AI", "VLA", "manipulation", "planning", "control", "sim-to-real", "physical AI"],
      fit: "Best for robotics, controls, RL, and embodied-AI PhDs. NVIDIA, Tesla, Waymo, and Google DeepMind are the primary destinations."
    },
    {
      id: "data-scientist",
      name: "Data Scientist / Causal Inference",
      shortName: "Data Sci",
      problem: "Design experiments, measure causality, and translate statistical models into business decisions at scale.",
      phdSignals: ["causal inference", "A/B and experimentation platforms", "Bayesian modeling", "econometrics", "SQL + Python", "business impact framing"],
      keywords: ["data scientist", "causal inference", "experimentation", "A/B test", "bayesian", "statistics", "econometrics"],
      fit: "Best for PhDs with stats, econ, or quantitative-heavy ML backgrounds. Airbnb, Meta, Amazon, and LinkedIn are the primary employers."
    },
    {
      id: "systems-phd",
      name: "Systems Engineer, PhD",
      shortName: "Systems PhD",
      problem: "Use PhD-level systems depth inside infrastructure, compilers, distributed systems, or ML platform engineering.",
      phdSignals: ["distributed systems", "compilers", "GPU / HPC", "networking", "performance engineering", "database / storage"],
      keywords: ["software engineer PhD", "distributed systems", "compiler", "infrastructure", "HPC", "database", "systems programming"],
      fit: "Best for systems, compiler, architecture, or networking PhDs. Google's PhD SWE Infrastructure track and Databricks' PhD-SWE role are the clearest pathways."
    }
  ],

  companies: [
    {
      id: "google",
      name: "Google",
      sourceIds: ["google-ai", "google-infra"],
      summary: "Explicit PhD early-career SWE tracks for AI/ML and Infrastructure. Strong signal for PhD depth plus engineering breadth. Google Brain has merged into DeepMind; Google SWE PhD is a distinct engineering track.",
      roles: ["Software Engineer, PhD, Early Career, AI/Machine Learning", "Software Engineer, PhD, Early Career, Infrastructure"]
    },
    {
      id: "deepmind",
      name: "Google DeepMind",
      sourceIds: ["deepmind-careers", "deepmind-rs-reasoning", "deepmind-rs-multimodal"],
      summary: "Frontier model lab behind Gemini. Separate from Google SWE PhD hiring. Core research mission with dedicated teams in Reasoning & AGI, Multimodal LLMs, Alignment, Robotics (Atlas), and World Models.",
      roles: ["Research Scientist, Reasoning & AGI", "Research Scientist, Multimodal LLMs", "Research Scientist, World Models", "Research Engineer", "Research Scientist, Post-AGI Research"]
    },
    {
      id: "meta",
      name: "Meta",
      sourceIds: ["meta-careers"],
      summary: "FAIR does foundational ML research; applied teams own recommendation, ranking, and ads at massive scale. Login-gated careers page—treat role mix as inferred from Meta career taxonomy.",
      roles: ["Research Scientist", "Research Engineer", "Research Engineer, CV/Multimodal GenAI", "Software Engineer, Machine Learning", "Machine Learning Engineer"]
    },
    {
      id: "amazon",
      name: "Amazon",
      sourceIds: ["amazon-science"],
      summary: "Very explicit student/graduate science taxonomy: Applied Scientist, Data Scientist, Research Scientist. AWS, Alexa, Bedrock, and recommendations are primary product contexts.",
      roles: ["Applied Scientist", "Data Scientist", "Research Scientist"]
    },
    {
      id: "apple",
      name: "Apple",
      sourceIds: ["apple-aiml"],
      summary: "AIML roles are product-embedded: Apple Intelligence, Siri, Maps, privacy-preserving ML, and on-device optimization. Degree level varies; many roles are senior—new-grad fit must be verified per JD.",
      roles: ["AI Engineer", "Applied Research Engineer, Multimodal LLMs", "Machine Learning Research Engineer", "ML Systems Engineer"]
    },
    {
      id: "microsoft",
      name: "Microsoft",
      sourceIds: ["microsoft-careers"],
      summary: "Applied Scientist and Research Software Engineer are the primary PhD tracks. Azure, Copilot, Bing, and Microsoft Research are main product contexts. Dynamic rendering limits per-JD scraping.",
      roles: ["Applied Scientist", "Researcher", "Research Software Engineer", "Software Engineer"]
    },
    {
      id: "nvidia",
      name: "NVIDIA",
      sourceIds: ["nvidia-careers"],
      summary: "GPU hardware, physical AI, robotics, autonomous vehicles, HPC, and accelerated computing. Explicit 'PhD New College Grad' Research Scientist postings in 2026. NVIDIA's ecosystem connects silicon to software.",
      roles: ["Research Scientist, Generative AI for Physical AI - PhD New College Grad", "Deep Learning Computer Architect - New College Grad", "ML Applications and Compiler Engineer - New College Grad", "Systems Performance Engineer - New College Grad"]
    },
    {
      id: "openai",
      name: "OpenAI",
      sourceIds: ["openai-emerging"],
      summary: "Emerging Talent program explicitly covers research, applied engineering, and product for 0-3 years experience. Research taste + execution matters; safety mission is central.",
      roles: ["Research Engineer", "Research Scientist", "Applied Engineer", "Product Engineer"]
    },
    {
      id: "anthropic",
      name: "Anthropic",
      sourceIds: ["anthropic-careers"],
      summary: "Researchers do engineering and engineers do research; ~50% of technical staff hold PhDs. Explicit team tracks: Interpretability, Honesty, Alignment Science, Safeguards, Performance RL, Pretraining. Safety mission is non-negotiable.",
      roles: ["Research Engineer / Scientist, Interpretability", "Research Engineer / Scientist, Alignment Science", "Research Engineer, Performance RL", "Research Engineer, Pretraining", "ML Systems Engineer", "Performance Engineer (GPU)"]
    },
    {
      id: "tiktok",
      name: "TikTok",
      sourceIds: ["tiktok-careers"],
      summary: "PhD Opportunities program exists as an explicit early-career path. Core strengths: recommendation algorithm (core product), video GenAI, multimodal AI, and global-scale ML infrastructure.",
      roles: ["Algorithm Engineer", "Research Scientist, Video Generation / World Models", "Applied Scientist, Trust & Safety", "Machine Learning Engineer"]
    },
    {
      id: "waymo",
      name: "Waymo",
      sourceIds: ["waymo-careers"],
      summary: "Autonomous driving = robotics at scale. Careers page was not safely accessible in this scrape. Strong signal for perception, prediction, planning, and safety-critical systems.",
      roles: ["ML Engineer, Perception", "Research Scientist, Autonomy", "Planning & Controls Engineer", "Simulation Engineer"]
    },
    {
      id: "databricks",
      name: "Databricks",
      sourceIds: ["databricks-open", "databricks-genai", "databricks-backend"],
      summary: "Strong data/AI infrastructure company. Explicit 'PhD - Software Engineer' role accepts PhD as alternative to 2+ years experience. Also hires GenAI Research Scientists and ML Engineers.",
      roles: ["PhD - Software Engineer", "Senior GenAI Research Scientist", "Machine Learning Engineer", "Backend / ML Infrastructure Engineer"]
    },
    {
      id: "scale",
      name: "Scale AI",
      sourceIds: ["scale-mlre-applied", "scale-mlre-agents", "scale-posttraining"],
      summary: "MLRE (Machine Learning Research Engineer) is the primary PhD hire. Two explicit tracks: GenAI Applied ML and Agents. Post-Training Research Scientist is also live. Base salary $252-315K for MLRS Post-Training.",
      roles: ["ML Research Engineer, GenAI Applied ML", "ML Research Engineer, Agents", "ML Research Scientist, Post-Training"]
    },
    {
      id: "xai",
      name: "xAI",
      sourceIds: ["xai-careers", "xai-model-training", "xai-voice"],
      summary: "Frontier-model lab. MTS (Member of Technical Staff) is the primary hire—credential-light, exceptional-work-heavy. Fast execution for Grok. Visa sponsorship explicitly offered.",
      roles: ["Member of Technical Staff, Model Training", "Member of Technical Staff, Voice Model", "ML Infrastructure Engineer"]
    },
    {
      id: "tesla",
      name: "Tesla",
      sourceIds: ["tesla-ai", "tesla-intern", "tesla-optimus", "tesla-rl"],
      summary: "Vision-only FSD + Optimus humanoid + Dojo supercomputer. Strongest PhD fit in embodied AI, vision foundation models, RL, and inference systems. Real-world deployment at fleet scale.",
      roles: ["AI Engineer, Foundation Models", "AI Engineer, Manipulation (Optimus)", "Reinforcement Learning Engineer, Self-Driving", "AI Engineering Intern"]
    },
    {
      id: "adobe",
      name: "Adobe",
      sourceIds: ["adobe-grad", "adobe-intern", "adobe-rs"],
      summary: "Explicit 2026 University Graduate Research Scientist/Engineer and intern research roles tied to PhD thesis. Adobe Research spans content intelligence, AI/ML, music/audio AI, CV, and Firefly generative AI.",
      roles: ["2026 University Graduate, Research Scientist/Engineer", "2026 Intern, Research Scientist/Engineer", "Applied Scientist", "Research Scientist"]
    },
    {
      id: "airbnb",
      name: "Airbnb",
      sourceIds: ["airbnb-intern", "airbnb-reasoning", "airbnb-ds"],
      summary: "Full-time AI roles are mostly senior/principal, but PhD reduces experience requirements significantly. Strong causal inference, marketplace ML, and reasoning/planning AI signals.",
      roles: ["Principal AI/ML Researcher, Reasoning & Planning", "Senior Data Scientist, Causal Inference", "ML Product Data Scientist"]
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      sourceIds: ["linkedin-reach"],
      summary: "REACH AI/ML Apprentice is the main early-career program but is not PhD-specific and not visa-sponsored. Stronger signal for RecSys and product ML than for research. Inside Microsoft ecosystem.",
      roles: ["AI/ML Apprentice Engineer", "Machine Learning Engineer", "Data Scientist", "Applied Scientist"]
    },
    {
      id: "roblox",
      name: "Roblox",
      sourceIds: ["roblox-jobs", "roblox-ai-platform", "roblox-multimodal", "roblox-engine"],
      summary: "Strongest explicit PhD Early Career coverage: multiple 'Senior ML Engineer - PhD Early Career' tracks across AI Platform, Multimodal AI/CV/Graphics, Recommendation Systems, and Engine Optimization.",
      roles: ["Senior ML Engineer, AI Platform - PhD Early Career", "Senior ML Engineer, Multimodal AI/CV/Graphics - PhD Early Career", "Senior ML Engineer, Recommendation Systems - PhD Early Career", "Senior ML Engineer, Engine Optimization - PhD Early Career"]
    }
  ],

  matrix: {
    "frontier-research": {
      google:     { score: 3, note: "Google Brain merged into DeepMind; Google's SWE PhD track is engineering-focused. Some frontier research exists in Google AI and Research teams." },
      deepmind:   { score: 5, note: "Core mission. Explicit RS roles in Reasoning & AGI, Multimodal LLMs, World Models, and Post-AGI Research on Greenhouse. PhD + publications + JAX/PyTorch required." },
      meta:       { score: 4, note: "FAIR does foundational ML research (LLaMA, JEPA, SAM). Strong publication culture; PyTorch is internal. PhD + top-conference papers valued." },
      amazon:     { score: 3, note: "Research Scientist track exists but is product-adjacent (Bedrock, Alexa, AWS). Less pure-research than lab companies." },
      apple:      { score: 3, note: "Mostly applied research. Some Apple Research roles in generative AI, multimodal, and NLP—verify seniority per JD." },
      microsoft:  { score: 4, note: "Microsoft Research (MSR) publishes broadly; applied science teams in Copilot, Azure, and Bing also hire research-oriented PhDs." },
      nvidia:     { score: 4, note: "Explicit 'Research Scientist, Generative AI for Physical AI - PhD New College Grad 2026' posted. Physical AI, GR00T, Cosmos, and simulation research are growth areas." },
      openai:     { score: 5, note: "Core mission. Emerging Talent covers 0-3yr; research taste + execution matters. Evals, agents, and reasoning are active hiring areas." },
      anthropic:  { score: 5, note: "~50% of staff hold PhDs. Independent research and open-source artifacts valued alongside publications. Researchers and engineers both do research." },
      tiktok:     { score: 3, note: "Research Scientist roles exist in video generation and world models; product scale dominates over pure research." },
      waymo:      { score: 4, note: "Research in perception, prediction, behavior modeling, and autonomy safety. Publications valued; AV deployment context differentiates from lab research." },
      databricks: { score: 4, note: "Senior GenAI Research Scientist role requires MS/PhD + first-author top-conference ML/systems papers. Efficient PyTorch research code expected." },
      scale:      { score: 4, note: "ML Research Scientist, Post-Training: PhD/MSc required, NeurIPS/ICML/ICLR publications expected, base salary $252-315K." },
      xai:        { score: 4, note: "MTS roles are credential-light but work-heavy: exceptional model-building evidence required. Frontier research on Grok pre/post-training." },
      tesla:      { score: 3, note: "Foundation model research for FSD and Optimus; more engineering-focused than lab companies. World model and vision research active." },
      adobe:      { score: 5, note: "Explicit 2026 University Graduate Research Scientist/Engineer JD. PhD or exceptional ability; intern role tied to PhD thesis. Adobe Research spans CV, audio AI, and content intelligence." },
      airbnb:     { score: 2, note: null },
      linkedin:   { score: 1, note: null },
      roblox:     { score: 3, note: "Applied research in 3D foundation models, safety, and identity. Less frontier ML research than lab companies." }
    },
    "safety-alignment": {
      google:     { score: 3, note: "Google DeepMind has an alignment team; Google has a Responsible AI practices team. Less dedicated than Anthropic/OpenAI." },
      deepmind:   { score: 4, note: "Dedicated alignment and safety team; RLHF and safety fine-tuning for Gemini. Publishes on scalable oversight and reward modeling." },
      meta:       { score: 3, note: "Responsible AI team exists; safety research within FAIR. Less safety-mission-driven than Anthropic/OpenAI." },
      amazon:     { score: 2, note: null },
      apple:      { score: 2, note: null },
      microsoft:  { score: 3, note: "Responsible AI team and MSR safety research; Azure content safety; Copilot safety alignment." },
      nvidia:     { score: 2, note: null },
      openai:     { score: 5, note: "Safety team is a core business unit. Reward modeling, Constitutional AI, scalable oversight, and interpretability are central. OpenAI published foundational RLHF and InstructGPT papers." },
      anthropic:  { score: 5, note: "Safety IS the mission. Explicit teams: Interpretability, Honesty, Alignment Science, Safeguards Labs, Cybersecurity RL. Constitutional AI originated here. More dedicated alignment hiring than any other company." },
      tiktok:     { score: 2, note: null },
      waymo:      { score: 3, note: "Safety-critical systems engineering; different flavor than model alignment but PhD-level rigor in safety verification and formal methods." },
      databricks: { score: 2, note: null },
      scale:      { score: 3, note: "Evaluation design and alignment evals are core to Scale's data product. RLHF/RLVR expertise valued." },
      xai:        { score: 3, note: "Factuality and honesty for Grok; model evaluation; safety without excessive refusals is a stated goal." },
      tesla:      { score: 2, note: null },
      adobe:      { score: 2, note: null },
      airbnb:     { score: 1, note: null },
      linkedin:   { score: 1, note: null },
      roblox:     { score: 2, note: null }
    },
    "applied-scientist": {
      google:     { score: 3, note: "Applied research exists in Search, Maps, and Ads. Less prominent than pure SWE PhD track." },
      deepmind:   { score: 3, note: "Some applied research within Gemini product teams. Core hiring leans toward frontier research." },
      meta:       { score: 4, note: "Applied scientist roles across ads, content, ranking, and growth. Production ML + experimentation + business metrics expected." },
      amazon:     { score: 5, note: "Primary PhD science track. Explicitly: Applied Scientists design complete systems and support production-level projects. Applied Scientist, Data Scientist, Research Scientist all targeted at students/graduates." },
      apple:      { score: 4, note: "AIML is product-embedded: Apple Intelligence, Siri, Maps, privacy-preserving ML. Generative AI Applied Scientist is an explicit title." },
      microsoft:  { score: 5, note: "Applied Scientist is the primary PhD hire across Azure AI, Bing, Copilot, and MSR. Scientific rigor + product integration expected. Advanced degree or equivalent." },
      nvidia:     { score: 3, note: "Applied research in physical AI and autonomous vehicles. More engineering-focused than Amazon/Microsoft." },
      openai:     { score: 3, note: "Applied Engineer role exists alongside research tracks. Product-focused applied work." },
      anthropic:  { score: 2, note: null },
      tiktok:     { score: 4, note: "Applied Scientist roles in Trust & Safety, Monetization, and Business Integrity. PhD Opportunities program explicit on careers site." },
      waymo:      { score: 3, note: "Autonomy applied science: behavior prediction, planning, safety analysis." },
      databricks: { score: 3, note: "Applied ML for enterprise data workflows, Mosaic AI, and ML lifecycle products." },
      scale:      { score: 4, note: "Applied ML Engineer role handles production evaluation, data pipelines, and enterprise GenAI workflows." },
      xai:        { score: 2, note: null },
      tesla:      { score: 2, note: null },
      adobe:      { score: 4, note: "Applied Scientist role connects ML/CV research to Creative Cloud, Firefly, Document Cloud, and marketing platform." },
      airbnb:     { score: 5, note: "Senior Data Scientist: PhD reduces experience requirement from 5yr to 2yr. Causal inference, experimentation, and marketplace modeling across guests, hosts, and pricing." },
      linkedin:   { score: 4, note: "ML Product Data Scientist and Applied Scientist roles emphasize production ML, experimentation, and member-facing features." },
      roblox:     { score: 3, note: "Applied Scientist PhD Intern track; applied research in safety, identity, and discovery." }
    },
    "research-engineer": {
      google:     { score: 4, note: "SWE PhD AI/ML track: coding + large-scale ML/AI systems + TensorFlow/JAX/PyTorch + production quality. PhD in CS/ML required." },
      deepmind:   { score: 4, note: "Research Engineer roles support frontier research: systems fluency + research taste + JAX/TPU experience valued." },
      meta:       { score: 4, note: "Research Engineer roles span CV, multimodal, NLP, and recommendation at FAIR and applied teams." },
      amazon:     { score: 3, note: "Applied Scientist titles sometimes overlap with Research Engineer responsibilities. Production ML focus." },
      apple:      { score: 4, note: "Machine Learning Research Engineer is an explicit title in Siri, Maps, and Core ML teams—involves both research and implementation." },
      microsoft:  { score: 4, note: "Research Software Engineer at MSR; engineering roles in Azure OpenAI and Copilot product teams expect research depth." },
      nvidia:     { score: 4, note: "Research Engineering for physical AI, simulation, and model optimization. Connects chip capability to software research." },
      openai:     { score: 5, note: "Core hire. Implements research at cluster scale; model/system intuition + strong code required. Debugging frontier model behavior is part of the role." },
      anthropic:  { score: 5, note: "RE is the primary technical hire at Anthropic. Researchers do engineering and engineers do research—papers may list engineers as first authors. Coding via tools in interviews." },
      tiktok:     { score: 3, note: "Research roles exist but are less RE-specific than lab companies." },
      waymo:      { score: 4, note: "Research Engineering across autonomy stack: simulation, behavior modeling, planning. Real-world deployment adds unique constraints." },
      databricks: { score: 5, note: "Senior GenAI Research Scientist role: MS/PhD required, first-author top ML/systems conference publications expected, efficient PyTorch research code, and ML/systems foundations." },
      scale:      { score: 5, note: "MLRE is Scale's primary PhD hire. Both tracks (GenAI Applied ML and Agents) require PhD/MSc, production ML systems, PyTorch/TF/JAX, and research depth with practical bias." },
      xai:        { score: 5, note: "MTS = RE at xAI. Model Training and Voice Model roles cover pre/post-training, JAX/PyTorch, Kubernetes, Spark/Ray, data curation, and product integration." },
      tesla:      { score: 4, note: "AI Engineer titles across Foundation Models, Optimus Manipulation, and RL Self-Driving. Large-scale training, inference, and embedded AI at real-world scale." },
      adobe:      { score: 5, note: "2026 University Graduate Research Scientist/Engineer is an explicit PhD new-grad role. Hands-on ML, product integration, and collaboration with Creative Cloud product teams." },
      airbnb:     { score: 3, note: "Principal AI/ML Researcher/Engineer in Reasoning, Planning, and Decision-Making—currently senior, but internship pathway exists." },
      linkedin:   { score: 2, note: null },
      roblox:     { score: 5, note: "Multiple 'Senior ML Engineer - PhD Early Career' JDs explicitly targeting PhD new grads across AI Platform, CV/Graphics, Recommendation Systems, and Engine Optimization." }
    },
    "llm-posttraining": {
      google:     { score: 4, note: "Gemini post-training via Google DeepMind. Google SWE PhD AI/ML track also involves large-scale LLM work. JAX/TPU expertise valued." },
      deepmind:   { score: 4, note: "RLHF and alignment fine-tuning for Gemini; post-training includes SFT, preference learning, and safety fine-tuning at frontier scale." },
      meta:       { score: 4, note: "LLaMA post-training: SFT, RLHF, DPO, preference learning at massive scale. Production-facing alignment work for open-source and internal models." },
      amazon:     { score: 4, note: "Bedrock, Titan, and Nova model teams do fine-tuning and RLHF. Alexa LLM and Rufus (shopping assistant) post-training are active areas." },
      apple:      { score: 4, note: "Apple Intelligence uses on-device and server-side LLMs. Post-training for instruction following, tone control, and privacy-preserving fine-tuning." },
      microsoft:  { score: 4, note: "Azure OpenAI Service and Copilot teams do RLHF-style alignment and fine-tuning. MSR publishes on preference learning and instruction tuning." },
      nvidia:     { score: 3, note: "NeMo framework for LLM fine-tuning; more infra-focused than post-training research." },
      openai:     { score: 5, note: "Core business is training GPT and o-series models. RLHF, DPO, reward modeling, SFT are central. Post-training is a primary team with heavy PhD hiring." },
      anthropic:  { score: 5, note: "RL for Claude is core. Explicit teams: Performance RL, Reinforcement Learning (multiple tracks), Cybersecurity RL. RLHF, RLAIF, Constitutional AI, and reward modeling are central to the product." },
      tiktok:     { score: 4, note: "GenAI content creation, instruction tuning for creative AI, and TikTok's LLM teams. Video-aware LLM training is unique to TikTok's product." },
      waymo:      { score: 2, note: null },
      databricks: { score: 4, note: "DBRX and Mosaic AI involve LLM training, SFT, and alignment work. Post-training expertise for enterprise-grade LLMs at Databricks AI." },
      scale:      { score: 5, note: "MLRE Agents role explicitly requires: RLHF/RLVR, post-training, preference modeling, instruction tuning, and recent NeurIPS/ICLR/ICML publications. Base salary $252-315K." },
      xai:        { score: 5, note: "MTS Model Training: critical modeling challenges, model usefulness, factuality, and fast execution. MTS Voice Model: speech pre/post-training, JAX/PyTorch, Spark/Ray, Kubernetes. Visa sponsorship explicit." },
      tesla:      { score: 3, note: "Foundation models for autonomy involve behavior tuning but are more vision-centric than classic LLM post-training." },
      adobe:      { score: 3, note: "Firefly and creative AI involve some instruction-following fine-tuning. Less RLHF-specific than lab companies." },
      airbnb:     { score: 3, note: "Reasoning, planning, and decision-making AI research involves some LLM post-training. LRM/LLM post-training and RL decisioning in Principal AI/ML role." },
      linkedin:   { score: 3, note: "LLM-powered feed, search, and job matching involve some fine-tuning work." },
      roblox:     { score: 3, note: "GenAI content and 3D generation involve some LLM post-training for creative context." }
    },
    "multimodal-genai": {
      google:     { score: 4, note: "Gemini is natively multimodal. SWE PhD AI/ML track involves large-scale multimodal model work. JAX/TPU expertise valued." },
      deepmind:   { score: 5, note: "Explicit Research Scientist, Multimodal LLMs role (Tokyo, London). Gemini development is a core mission. Video, image, and audio AI at the frontier." },
      meta:       { score: 5, note: "Explicit Research Engineer CV/Multimodal GenAI and AI Research Scientist VLLM roles on Greenhouse. CVPR/NeurIPS publications valued. Meta AI generates images/video natively." },
      amazon:     { score: 3, note: "Some multimodal work in Alexa, AWS Bedrock multimodal APIs, and Just Walk Out vision." },
      apple:      { score: 5, note: "Explicit 'Applied Research Engineer - Multimodal LLMs for Human Interaction' JD. Apple Intelligence is natively multimodal. MS/PhD with 2yr or PhD required; CVPR/NeurIPS publications valued." },
      microsoft:  { score: 4, note: "Copilot Designer, Azure OpenAI multimodal APIs, and MSR multimodal research. GPT-4V integration work." },
      nvidia:     { score: 4, note: "NVIDIA COSMOS world model and physical AI pipelines require video/3D understanding. GR00T uses visual observation as input." },
      openai:     { score: 4, note: "DALL-E, Sora, GPT-4V, and voice models are live products. Multimodal research and engineering are active hiring areas." },
      anthropic:  { score: 4, note: "Claude has vision capabilities; multimodal research is active. Less product-driven than Apple/Meta/Adobe." },
      tiktok:     { score: 5, note: "Explicit Research Scientist roles in video generation and world models in new grad search. Video is TikTok's native medium—video understanding + generation is the primary technical focus." },
      waymo:      { score: 3, note: "Multimodal perception for autonomous driving. More domain-specific than general multimodal." },
      databricks: { score: 3, note: "Mosaic AI supports multimodal model fine-tuning and deployment for enterprise." },
      scale:      { score: 4, note: "Multimodal evals, data annotation for vision/language models, and enterprise GenAI workflows." },
      xai:        { score: 4, note: "Aurora (world model), Grok vision capabilities, and multimodal Grok features. Video and image understanding active." },
      tesla:      { score: 4, note: "Vision foundation models for FSD are natively multimodal: cameras, radar, ultrasonic, world models for planning. Large-scale image/video training on fleet data." },
      adobe:      { score: 5, note: "Firefly (text-to-image, text-to-video, audio), Photoshop generative fill, Express AI. Diffusion models and multimodal generation are Adobe's primary AI growth area. CV + generative research are central." },
      airbnb:     { score: 2, note: null },
      linkedin:   { score: 2, note: null },
      roblox:     { score: 5, note: "Explicit 'Senior ML Engineer, Multimodal AI, CV and Graphics - PhD Early Career' JD. At the intersection of visual foundation models, 3D graphics, generative modeling, and production impact." }
    },
    "recsys-ranking": {
      google:     { score: 4, note: "Search, YouTube, and Maps run large-scale ranking systems. ML infrastructure and experimentation at Google scale. Some PhD RecSys hiring." },
      deepmind:   { score: 2, note: null },
      meta:       { score: 5, note: "Recommendation and ranking is Meta's core business. Feeds, ads, Marketplace, and Reels ranking are primary product-ML roles. Massive scale, A/B testing, and embedding model expertise valued." },
      amazon:     { score: 5, note: "Recommendation and personalization is core: shopping recommendations, search ranking, Alexa, and personalization at AWS. Applied Scientist track directly serves RecSys." },
      apple:      { score: 3, note: "App Store, Siri suggestions, and Apple News use ML ranking. Less prominent than Meta/TikTok." },
      microsoft:  { score: 3, note: "Bing search ranking, LinkedIn feeds (via acquisition), and Copilot retrieval ranking." },
      nvidia:     { score: 2, note: null },
      openai:     { score: 2, note: null },
      anthropic:  { score: 1, note: null },
      tiktok:     { score: 5, note: "Content ranking algorithm IS TikTok's product advantage. Algorithm Engineer is a unique TikTok title. Recommendation, content understanding, and engagement optimization at billion-user scale." },
      waymo:      { score: 1, note: null },
      databricks: { score: 3, note: "Mosaic AI and enterprise ML platforms serve RecSys use cases; some hiring for ML engineers building ranking systems." },
      scale:      { score: 3, note: "Scale provides training data for RecSys models; some applied ML roles in ranking and retrieval." },
      xai:        { score: 3, note: "Grok feed ranking and X recommendations. Content personalization for the X platform." },
      tesla:      { score: 1, note: null },
      adobe:      { score: 2, note: null },
      airbnb:     { score: 5, note: "Search ranking, price optimization, recommendation, and guest/host matching are core marketplace ML challenges. AI observability and experimentation valued." },
      linkedin:   { score: 5, note: "Feed ranking, Jobs recommendation, LinkedIn Learning, Ads targeting, and People You May Know are all core RecSys problems. 'ML Product Data Scientist' title is LinkedIn-specific." },
      roblox:     { score: 5, note: "Explicit 'Senior ML Engineer, Recommendation Systems - PhD Early Career' JD. Discovery, personalization, and safety content ranking in a 3D immersive context." }
    },
    "ml-systems": {
      google:     { score: 5, note: "TPU hardware + XLA compiler + distributed training at scale. SWE PhD Infrastructure JD explicitly covers compilers, distributed systems, networking, ML infrastructure. Primary pathway is Google SWE PhD track." },
      deepmind:   { score: 4, note: "Research systems support at frontier scale: JAX/XLA optimization, large-cluster training, and inference infrastructure for Gemini." },
      meta:       { score: 4, note: "PyTorch core development, distributed training infra, and inference optimization. GPU-level systems work; multi-thousand GPU clusters." },
      amazon:     { score: 4, note: "SageMaker, Trainium/Inferentia hardware, and AWS ML infrastructure teams hire systems PhDs. Production-scale model serving and training." },
      apple:      { score: 4, note: "Core ML, ANE (Apple Neural Engine), and on-device inference optimization. Hardware-software co-design for edge ML is a unique Apple constraint." },
      microsoft:  { score: 4, note: "Azure ML, DeepSpeed (open-source from MSR), and distributed training infrastructure for Azure OpenAI. GPU-scale systems work." },
      nvidia:     { score: 5, note: "CUDA, TensorRT, Triton compiler, and NIM microservices are NVIDIA's core products. 'ML Applications and Compiler Engineer - New College Grad 2026' is an explicit PhD new-grad role. Inference performance and accelerated computing expertise directly valued." },
      openai:     { score: 5, note: "Training at 100,000+ GPU cluster scale. Distributed training, storage, networking, and inference optimization at the frontier. ML systems PhDs are a primary hire." },
      anthropic:  { score: 5, note: "Explicitly listed: ML Systems Engineer (Research Tools, RL Engineering) and Performance Engineer (GPU, Inference Systems). GPU optimization, training infra, and inference performance are active hiring areas." },
      tiktok:     { score: 4, note: "Large-scale model serving, video encoding pipelines, and real-time inference for billion-user feed. Distributed ML infra is central." },
      waymo:      { score: 4, note: "Real-time autonomy software requires GPU-accelerated inference, data infrastructure, and safety-critical systems engineering." },
      databricks: { score: 5, note: "Core product IS ML infrastructure: Spark, MLflow, Mosaic ML, distributed inference, model serving, and search. Backend PhD role accepts PhD as alternative to 2+ years experience." },
      scale:      { score: 4, note: "Evaluation pipelines, data infrastructure, and production ML systems for enterprise GenAI. Microservices and cloud systems experience valued." },
      xai:        { score: 5, note: "Distributed training for frontier LLMs; Kubernetes, Spark/Ray, data curation at massive scale. ML Infrastructure Engineer is an explicit title alongside MTS roles." },
      tesla:      { score: 4, note: "Dojo supercomputer for training; large-scale model training, inference, and embedded AI deployment. C++/Python/PyTorch, real-time systems constraints." },
      adobe:      { score: 3, note: "ML serving and model deployment for Firefly and Creative Cloud AI features." },
      airbnb:     { score: 3, note: "ML infrastructure, experimentation platform, and AI observability across marketplace features." },
      linkedin:   { score: 3, note: "ML infrastructure for recommendation and feed serving. Production ML systems at Microsoft scale." },
      roblox:     { score: 5, note: "Explicit 'Senior ML Engineer, AI Platform - PhD Early Career' JD: distributed inference, GenAI information retrieval, serving/model registry, and training/inference control planes." }
    },
    "computer-vision": {
      google:     { score: 4, note: "Google Photos, Maps, Search, and Research teams hire for CV. Visual foundation models and large-scale video understanding active." },
      deepmind:   { score: 4, note: "CV research within Gemini multimodal; embodied AI vision research via Atlas and physical AI initiatives." },
      meta:       { score: 5, note: "FAIR has a dedicated CV team. Explicit 'Research Engineer, CV/Multimodal GenAI' role. Segment Anything, DINOv2, and visual foundation model history. CVPR/ICCV papers highly valued." },
      amazon:     { score: 3, note: "Alexa vision, Just Walk Out stores, and Ring use CV. Less research-focused; production deployment emphasis." },
      apple:      { score: 5, note: "Camera, Photos, AR, and Maps rely heavily on on-device CV. Apple Vision Pro adds spatial AI requirements. Large CV hiring across Siri and hardware teams." },
      microsoft:  { score: 3, note: "Bing visual search, Azure CV services, and Designer use computer vision. Some MSR CV research." },
      nvidia:     { score: 5, note: "Isaac Perceptor and physical AI pipelines require CV for 3D scene understanding. Omniverse generates synthetic data for CV training. AV perception research is a core focus. 'Deep Learning Computer Architect - New College Grad 2026' is explicit." },
      openai:     { score: 3, note: "DALL-E, Sora, and GPT-4V involve CV components. Less dedicated CV hiring than Waymo/Tesla/Apple." },
      anthropic:  { score: 2, note: null },
      tiktok:     { score: 4, note: "Video understanding, visual effects, AR filters, and content moderation rely on CV. World model research requires video-scale CV." },
      waymo:      { score: 5, note: "3D object detection, multi-camera fusion, tracking, scene understanding, and point cloud processing are core. The entire Waymo product depends on perception. CVPR/ICCV-caliber CV PhDs are primary target." },
      databricks: { score: 2, note: null },
      scale:      { score: 3, note: "CV data annotation, evaluation pipelines for vision models, and enterprise multimodal AI." },
      xai:        { score: 3, note: "Aurora world model and Grok vision capabilities. Video and image understanding active." },
      tesla:      { score: 5, note: "Vision-only FSD (no lidar): the autonomy stack is entirely camera + vision foundation model. Fleet of ~6M vehicles generates labeled driving data at scale. Vision-first mandate at every level of the stack." },
      adobe:      { score: 4, note: "Adobe Research publishes in CVPR/SIGGRAPH. Firefly relies on visual generation models. CV for document understanding, photography, and creative tools." },
      airbnb:     { score: 2, note: null },
      linkedin:   { score: 2, note: null },
      roblox:     { score: 5, note: "Explicit 'Senior ML Engineer, Multimodal AI, CV and Graphics - PhD Early Career' JD. Visual foundation models, generative modeling, and real-time game engine integration—unique 3D + graphics context." }
    },
    "robotics": {
      google:     { score: 2, note: null },
      deepmind:   { score: 4, note: "Atlas partnership with Boston Dynamics; GR00T-style VLA research; dedicated embodied AI team. Physical AI research is a major growth area for DeepMind in 2026." },
      meta:       { score: 2, note: null },
      amazon:     { score: 3, note: "Warehouse robots, Amazon Robotics, and some embodied AI research. Less cutting-edge than Tesla/NVIDIA/Waymo." },
      apple:      { score: 1, note: null },
      microsoft:  { score: 2, note: null },
      nvidia:     { score: 5, note: "Isaac robotics platform, GR00T humanoid foundation model, COSMOS world model, Jetson edge hardware. NVIDIA is the primary compute and software platform for virtually every robot company. 'Research Scientist, Generative AI for Physical AI - PhD New College Grad 2026' is explicit." },
      openai:     { score: 2, note: null },
      anthropic:  { score: 1, note: null },
      tiktok:     { score: 1, note: null },
      waymo:      { score: 5, note: "Autonomous driving IS robotics at scale: Planning & Controls Engineer and Simulation Engineer are explicit titles. Real-time, safety-critical, fleet-scale deployment makes this uniquely demanding and technically deep." },
      databricks: { score: 1, note: null },
      scale:      { score: 3, note: "Robot training data, RLVR for physical AI, and evaluation infrastructure. Growing as robotics data demand increases." },
      xai:        { score: 1, note: null },
      tesla:      { score: 5, note: "Optimus (AI Engineer, Manipulation) + RL Self-Driving + Dojo supercomputer. Real-world fleet deployment at scale. Embodied AI, imitation learning, and RL for manipulation are active research areas." },
      adobe:      { score: 1, note: null },
      airbnb:     { score: 1, note: null },
      linkedin:   { score: 1, note: null },
      roblox:     { score: 3, note: "3D simulation, physics-based environments, and engine optimization have some overlap with robotics sim-to-real research." }
    },
    "data-scientist": {
      google:     { score: 3, note: "Data scientist roles exist in Ads, Search, and product teams. Less prominent than engineering-focused PhD tracks." },
      deepmind:   { score: 2, note: null },
      meta:       { score: 4, note: "Data science at scale: product analytics, experimentation, and causal inference across ads, content, and growth teams." },
      amazon:     { score: 4, note: "Amazon Science program targets Data Scientists: experimentation and causal modeling tied to services and products. PhD reduces experience requirements." },
      apple:      { score: 3, note: "Data science roles in Ads, App Store, and Apple Intelligence; less prominent than ML engineering." },
      microsoft:  { score: 4, note: "Product science at Bing, Copilot, Office, and Azure. Advanced degree + experimentation + causal inference background valued." },
      nvidia:     { score: 2, note: null },
      openai:     { score: 2, note: null },
      anthropic:  { score: 2, note: null },
      tiktok:     { score: 4, note: "Monetization, ads, and content analytics teams do large-scale A/B testing, causal modeling, and experiment design at global scale." },
      waymo:      { score: 3, note: "Data science for autonomy metrics, safety analysis, and operational performance." },
      databricks: { score: 3, note: "Data science and ML analytics within enterprise data platform context." },
      scale:      { score: 3, note: "Some applied analytics roles around evaluation quality and data pipeline metrics." },
      xai:        { score: 2, note: null },
      tesla:      { score: 2, note: null },
      adobe:      { score: 3, note: "Data science for Creative Cloud engagement, Firefly usage metrics, and content analytics." },
      airbnb:     { score: 5, note: "Explicit 'Senior Data Scientist, Causal Inference' JD: PhD reduces requirement from 5yr to 2yr. Principal AI/ML Researcher in Reasoning & Planning is also a data-science-adjacent role. Marketplace causality is a core research challenge." },
      linkedin:   { score: 4, note: "ML Product Data Scientist role: product analytics, A/B testing, and causal inference for member experience. Feed and recommendation science." },
      roblox:     { score: 3, note: "Data science for game economy, safety, and user engagement metrics." }
    },
    "systems-phd": {
      google:     { score: 5, note: "Explicit 'Software Engineer, PhD, Early Career, Infrastructure 2026' JD. Minimum quals: PhD in CS or related. Preferred areas: algorithms, architecture, compilers, databases, distributed systems, ML, networking, storage." },
      deepmind:   { score: 3, note: "Systems engineering to support frontier research. Some research systems roles but less prominent than Google SWE PhD track." },
      meta:       { score: 4, note: "Systems engineering at massive scale: distributed systems, infra, storage, and networking for billions of users." },
      amazon:     { score: 4, note: "AWS systems engineering: distributed storage, networking, compute, and ML infrastructure. PhD-level depth in systems valued." },
      apple:      { score: 4, note: "Platform engineering, compiler work for ANE, hardware-software co-design, and systems programming for on-device ML." },
      microsoft:  { score: 4, note: "Azure distributed systems, cloud infrastructure, and MSR systems research. DeepSpeed and distributed training expertise." },
      nvidia:     { score: 5, note: "'Systems Performance Engineer - Agentic AI Workloads - New College Grad 2026' is explicit. GPU architecture, CUDA compiler, HPC networking, and performance engineering roles all hire PhDs." },
      openai:     { score: 4, note: "Infrastructure for 100,000+ GPU cluster: distributed systems, storage, networking, and reliability engineering at frontier scale." },
      anthropic:  { score: 4, note: "Infrastructure and systems engineering support training, inference, and research infrastructure. ML Systems Engineer role listed." },
      tiktok:     { score: 4, note: "Large-scale distributed systems for global content delivery, video processing, and ML serving infrastructure." },
      waymo:      { score: 4, note: "Real-time safety-critical systems, data infrastructure for AV, and simulation platform engineering." },
      databricks: { score: 5, note: "Explicit 'PhD - Software Engineer' role: PhD accepted as alternative to 2+ years experience for backend systems. Distributed systems, Spark, backend services, search/relevance, and production reliability." },
      scale:      { score: 3, note: "Backend systems for data pipelines and evaluation infrastructure. Less PhD-systems-specific than Google/Databricks." },
      xai:        { score: 4, note: "Infrastructure for frontier LLM training: distributed compute, Kubernetes orchestration, and large-scale storage." },
      tesla:      { score: 4, note: "Dojo systems, embedded firmware, real-time automotive software, and fleet data infrastructure. C++ systems programming at scale." },
      adobe:      { score: 2, note: null },
      airbnb:     { score: 2, note: null },
      linkedin:   { score: 3, note: "Infrastructure for large-scale ML serving, feed systems, and member data platform." },
      roblox:     { score: 4, note: "Engine Optimization PhD Early Career: applies ML to real-time engine optimization, predictive resource allocation, and content delivery. Game engine systems + ML is a unique combination." }
    }
  },

  signalLegend: [
    { value: 5, label: "Very strong", className: "signal-5" },
    { value: 4, label: "Strong",       className: "signal-4" },
    { value: 3, label: "Moderate",     className: "signal-3" },
    { value: 2, label: "Weak",         className: "signal-2" },
    { value: 1, label: "Sparse",       className: "signal-1" }
  ],

  strategyRules: [
    {
      signal: "Top-conference first-author papers",
      bestClusters: ["frontier-research", "safety-alignment", "research-engineer"],
      advice: "Lead with your research contribution and thesis impact. Publications are table stakes for research scientist tracks; research engineer roles value them as evidence of research taste."
    },
    {
      signal: "RL / RLHF / post-training background",
      bestClusters: ["llm-posttraining", "safety-alignment", "research-engineer"],
      advice: "Frame your work around shaping model behavior: reward modeling, preference optimization, and alignment evals are in extremely high demand. Scale, xAI, Anthropic, and OpenAI are primary destinations."
    },
    {
      signal: "Computer vision / 3D / video background",
      bestClusters: ["computer-vision", "robotics", "multimodal-genai"],
      advice: "Waymo and Tesla want perception-first CVPhDs; Apple and Meta want visual foundation model builders; NVIDIA bridges both. Show 3D or video experience if you have it."
    },
    {
      signal: "Systems / GPU / compiler / distributed background",
      bestClusters: ["ml-systems", "systems-phd", "research-engineer"],
      advice: "Show profiling data, performance numbers, and cluster-scale experience. Google SWE PhD Infrastructure and Databricks PhD-SWE are the clearest new-grad pathways."
    },
    {
      signal: "Recommendation / ranking / ads experience",
      bestClusters: ["recsys-ranking", "data-scientist", "applied-scientist"],
      advice: "TikTok, Meta, LinkedIn, Roblox, and Airbnb are the strongest RecSys employers. Emphasize embedding models, online evaluation, and business metric impact."
    },
    {
      signal: "Causal inference / stats / econometrics background",
      bestClusters: ["data-scientist", "applied-scientist"],
      advice: "Airbnb, Amazon, and Meta reduce experience requirements substantially for causal-inference PhDs. Frame work as experiment design + business translation, not just statistics."
    },
    {
      signal: "Robotics / controls / planning background",
      bestClusters: ["robotics", "computer-vision", "ml-systems"],
      advice: "NVIDIA (Isaac/GR00T), Tesla (Optimus + FSD), and Waymo are the primary destinations. Sim-to-real and VLA model experience are increasingly valued."
    }
  ],

  roadmaps: {
    "frontier-research": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "精读 50–100 篇 NeurIPS/ICML/ICLR 经典论文，建立 research taste 和 literature sense",
          "复现 2–3 篇重要论文，掌握 PyTorch/JAX + 大规模训练 pipeline",
          "与导师对齐 research agenda，明确你想解决什么 open problem"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "提出 novel 方法（新架构、训练目标、或数据效率），做充分消融实验",
          "投 NeurIPS/ICML/ICLR，争取至少 1 篇第一作者，修改至接受",
          "参与 Anthropic / OpenAI / Google DeepMind 暑期研究实习，转正概率高"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "整理清晰的 research narrative：你解决了什么问题、为什么重要、下一步是什么",
          "申请 OpenAI Emerging Talent / Anthropic / DeepMind full-time，早申请早决定",
          "请导师写强推荐信，通过实习或学术会议建立与目标公司研究员的联系"
        ]
      }
    ],
    "safety-alignment": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "掌握 RL、语言模型基础；精读 InstructGPT、Constitutional AI、Anthropic Interpretability 系列",
          "了解 alignment 开放问题：scalable oversight、reward hacking、deceptive alignment",
          "加入 MATS、ARENA 或 Anthropic/ARC 的 safety 培训项目，建立社区联系"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "选定细分方向：mechanistic interpretability、reward modeling、evaluation design 或 scalable oversight",
          "在 Anthropic / OpenAI / ARC 或学术实验室完成 safety-relevant 研究并发表",
          "产出具体的 safety artifact：评估基准、可解释性工具、或 alignment 实验"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "申请 Anthropic RE/RS（Interpretability / Honesty / Alignment Science 团队）",
          "准备关于「你如何看待某个 alignment 难题」的清晰技术观点，面试中会深入讨论",
          "Anthropic 的面试侧重独立思考能力，而非纯 leetcode，提前练习 research discussion"
        ]
      }
    ],
    "applied-scientist": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "掌握统计学、A/B 实验设计、因果推断基础；熟练 Python + SQL",
          "阅读 Amazon Science / Netflix TechBlog / Meta AI Blog，理解 applied science 工作方式",
          "学习 ML 建模基础：分类、回归、ranking、推荐系统"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做一个端到端的 applied ML 项目，有明确的 business metric（CTR、转化率、GMV）",
          "实习：Amazon Applied Scientist / Microsoft Applied Scientist / Meta 数据科学",
          "在 KDD / RecSys / WWW applied track 发表，展示「科学 → 产品」的完整路径"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "准备 case-study 面试：问题定义 → 实验设计 → 结果解读 → 业务建议",
          "简历强调 metric improvement——不是「做了模型」，而是「提升了 X 指标 Y%」",
          "目标：Amazon AS、Microsoft AS、Meta DS、Adobe / TikTok Applied Scientist"
        ]
      }
    ],
    "research-engineer": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "掌握 PyTorch/JAX + 分布式训练（DDP、FSDP）+ 大模型训练 pipeline",
          "学习系统优化：profiling、内存管理、throughput 调优、FlashAttention",
          "阅读 Scaling Laws、Chinchilla、FlashAttention 等 systems + research 论文"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "在导师组或实习中复现 SOTA 模型并做有效改进，展示「写论文 + 写高质量代码」双线能力",
          "贡献到开源项目（HuggingFace Transformers、vLLM、PyTorch），有 merged PR",
          "参与 Anthropic / OpenAI / Scale AI 暑期实习，直接接触 research engineering 工作流"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "申请 Anthropic RE / OpenAI RE / Scale MLRE / Roblox PhD Early Career",
          "准备 coding 面试（LeetCode medium+）+ ML system design 题",
          "核心卖点：能在 2–3 天内把 paper idea 跑出实验结果，同时代码 production-ready"
        ]
      }
    ],
    "llm-posttraining": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "深入理解 RLHF（PPO/GRPO）、SFT、DPO 理论与实现；精读原论文并复现",
          "掌握 JAX/PyTorch + 分布式 fine-tuning pipeline；了解 preference data 构建方法",
          "关注 reward hacking、RLHF 稳定性、preference data 质量等工程难点"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做 post-training 研究：reward modeling 改进、preference optimization、instruction tuning",
          "投 ACL / EMNLP / NeurIPS / ICML，聚焦 alignment 或 post-training 方向",
          "参与 Anthropic RL teams / xAI / Scale AI 暑期实习，接触真实 post-training 工作流"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "申请 xAI MTS（Model Training）/ Anthropic Performance RL / Scale AI MLRE Agents",
          "准备 LLM system design 面试：如何设计 RLHF pipeline、如何评估 reward model 质量",
          "核心卖点：理解 reward signal 的来源与局限性，能 debug model behavior 退化问题"
        ]
      }
    ],
    "multimodal-genai": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "掌握 diffusion models（DDPM、Flow Matching）、VLM（CLIP、LLaVA）基础架构",
          "熟悉 PyTorch + vision + NLP 双栈；了解 DALL-E、Stable Diffusion、Sora 技术路线",
          "阅读 CVPR / NeurIPS / ICLR 中 multimodal 和 generative model 方向的高引论文"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "选定方向：图文生成、视频 AI、speech-vision-language 三模态、或 3D 生成",
          "在 CVPR / ICCV / NeurIPS / ECCV 发表 multimodal 方向论文，争取第一作者",
          "参与 Apple / Meta / Adobe / TikTok multimodal 暑期实习，接触产品规模的训练"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "展示完整训练经验（从头训练或大规模 fine-tuning，不只是套用 API）",
          "Apple 和 Meta 看 CVPR/NeurIPS 发表；Adobe 看 creative AI 应用能力",
          "准备 CV + ML 混合面试 + 模型设计题（如如何设计 text-to-image 模型）"
        ]
      }
    ],
    "recsys-ranking": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "学习推荐系统基础：Matrix Factorization、Two-Tower、DLRM、序列推荐（SIM、DIEN）",
          "掌握 SQL + Python + Spark；了解工业级 feature engineering 和 embedding 训练",
          "阅读 YouTube DNN、TikTok 推荐、Meta DLRM 等工业 RecSys 论文"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做端到端 RecSys 项目：数据 → 模型 → 离线评估 → 在线 A/B test 模拟",
          "参与 KDD Cup 推荐赛道，或在 KDD / RecSys / WWW 发表",
          "申请 TikTok / Meta / LinkedIn / Roblox 推荐系统暑期实习"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "准备 ML 面试（embedding model 设计、冷启动处理、实时 vs 离线特征权衡）+ SQL",
          "强调对 online/offline metric gap 的理解：为什么离线 AUC 高，在线指标不一定涨",
          "TikTok Algorithm Engineer 特别考核 engagement modeling 和 exploration/exploitation 权衡"
        ]
      }
    ],
    "ml-systems": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "学习 GPU 编程（CUDA / Triton）、PyTorch internals（autograd、memory management）",
          "了解分布式训练：数据并行、张量并行、pipeline 并行；阅读 Megatron-LM、DeepSpeed",
          "阅读 FlashAttention、vLLM、TensorRT、PagedAttention 等 inference 优化论文"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做 ML systems 研究：inference latency 优化、training throughput、memory efficiency",
          "投 MLSys / OSDI / SOSP / EuroSys 或 NeurIPS systems track",
          "贡献开源：CUDA kernel / vLLM / PyTorch，有 merged PR 是强信号"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "用具体数字说话：latency reduction X%、throughput 提升 Y×、显存节省 Z GB",
          "申请 NVIDIA / xAI（ML Infra）/ Anthropic Performance Engineer（GPU）实习",
          "准备 systems design 面试：如何设计分布式推理系统、如何优化 KV cache"
        ]
      }
    ],
    "computer-vision": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "掌握 CNN、ViT、DETR、SAM 等核心架构；了解 3D 视觉（NeRF、3DGS、点云）",
          "熟悉 PyTorch + torchvision + Open3D；了解 AV 任务（3D detection、tracking、prediction）",
          "阅读 CVPR / ICCV / ECCV 高引论文，建立对 CV research landscape 的整体认知"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "选定方向：2D/3D detection、视频理解、视觉生成、or 自动驾驶 perception",
          "在 CVPR / ICCV / ECCV 发表，争取第一作者；有 demo 或 benchmark 更有说服力",
          "申请 Waymo / Tesla / Apple / Meta / NVIDIA CV 暑期实习"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "Waymo / Tesla 强调 3D perception 和大规模真实数据经验，展示 AV 任务经验",
          "Apple 强调 on-device 和 privacy-preserving CV，了解 Core ML / ANE 约束",
          "Meta 强调 visual foundation model（DINOv2、SAM 风格），看 CVPR/ICCV 发表"
        ]
      }
    ],
    "robotics": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "学习 ROS/ROS2、MuJoCo/Isaac Sim；掌握控制理论基础（PID、LQR、MPC）",
          "掌握 RL 框架（Isaac Lab、Stable Baselines3）；阅读 RT-2、OpenVLA、VLA 系列论文",
          "建立 sim-to-real gap 的直觉：哪些方法可以泛化，哪些会崩"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做完整的机器人学习实验：sim 训练 → real-world 或 high-fidelity sim 验证",
          "在 CoRL / ICRA / IROS / NeurIPS 发表；有真实机器人 demo 视频是极强信号",
          "申请 NVIDIA Isaac / Tesla Optimus / Google DeepMind 暑期实习"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "强调 sim + real 双轨经验，只有 sim 不够；准备任务成功率数据和 failure mode 分析",
          "NVIDIA 看 VLA + physical AI；Tesla 看 manipulation + RL；Waymo 看 planning + safety",
          "展示跨技能栈能力：感知 + 规划 + 控制的全链路理解"
        ]
      }
    ],
    "data-scientist": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "深入学习因果推断（潜在结果框架、IV、DID、RDD）；读《Mostly Harmless Econometrics》",
          "掌握 Python/R + SQL + 大规模数据处理（Spark / BigQuery）",
          "学习 A/B test 设计与统计显著性：power analysis、多重检验、网络效应"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做有真实业务数据的因果研究项目，最好有实习支撑",
          "申请 Airbnb / Meta / Amazon / Netflix DS 暑期实习，接触真实的实验平台",
          "在 KDD / WebConf / ICDE 发表 applied data science 论文"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "准备 case interview：问题定义 → 实验设计 → 结果解读 → 业务建议的完整链条",
          "能清晰解释 causal effect vs correlation、selection bias、novelty effect 等常见陷阱",
          "Airbnb 和 Netflix 特别看重 experimentation platform 和 marketplace causality 经验"
        ]
      }
    ],
    "systems-phd": [
      {
        phase: "建基础",
        timing: "PhD 前 1–2 年",
        items: [
          "深入学习分布式系统（MIT 6.824 / 6.5840）、操作系统、编译器原理",
          "掌握 C++（优先）或 Go/Rust；了解 GPU 体系结构和 CUDA 编程模型",
          "阅读 OSDI/SOSP 经典论文：MapReduce、Raft、Spanner、F1、Dynamo"
        ]
      },
      {
        phase: "出成果",
        timing: "PhD 2–4 年",
        items: [
          "做系统研究：distributed training 框架、编译器优化、ML infra、存储或网络",
          "投 OSDI / SOSP / EuroSys / NSDI / MLSys，有完整的系统实现和 benchmark",
          "参与 Google SWE PhD / Databricks / NVIDIA systems 暑期实习"
        ]
      },
      {
        phase: "准备求职",
        timing: "申请前 6–12 月",
        items: [
          "用具体性能数字说话：throughput、latency、resource efficiency 的量化对比",
          "Google SWE PhD Infrastructure 面试：coding + distributed systems design + 论文讨论",
          "Databricks PhD-SWE 侧重 backend systems + distributed computing，非纯研究"
        ]
      }
    ]
  },

  sources: [
    {
      id: "google-ai",
      company: "Google",
      title: "Software Engineer, PhD, Early Career, AI/Machine Learning, 2026 Start",
      url: "https://www.google.com/about/careers/applications/jobs/results/122258040807137990-software-engineer-phd-early-career-aimachine-learning-2026-start",
      evidence: "Minimum qualifications: PhD in CS/ML/AI; coding; ML/AI experience. Preferred: large-scale ML/AI systems, complex models, TensorFlow/JAX/PyTorch, 2026 availability.",
      evidenceLevel: "direct JD"
    },
    {
      id: "google-infra",
      company: "Google",
      title: "Software Engineer, PhD, Early Career, Infrastructure, 2026 Start",
      url: "https://www.google.com/about/careers/applications/jobs/results/88714689822761670-software-engineer-phd-early-career-infrastructure-2026-start",
      evidence: "Minimum qualifications: PhD in CS; coding; distributed systems/concurrency. Preferred areas: algorithms, architecture, AI, compilers, databases, distributed systems, ML, networking, storage, or systems.",
      evidenceLevel: "direct JD"
    },
    {
      id: "deepmind-careers",
      company: "Google DeepMind",
      title: "Careers at Google DeepMind",
      url: "https://deepmind.google/careers/",
      evidence: "Official DeepMind careers page with roles in research, safety, engineering, and robotics. Separate hiring track from Google SWE PhD. RS roles in Reasoning & AGI, Multimodal LLMs, World Models, and Post-AGI Research are listed.",
      evidenceLevel: "official careers page"
    },
    {
      id: "deepmind-rs-reasoning",
      company: "Google DeepMind",
      title: "Research Scientist, Reasoning & AGI, Google DeepMind",
      url: "https://job-boards.greenhouse.io/deepmind/jobs/7135585",
      evidence: "Requires PhD in CS/ML/AI or equivalent; track record of publications; experience with transformer models and data pipelines; deep learning frameworks (PyTorch, JAX); large-scale model training.",
      evidenceLevel: "direct JD"
    },
    {
      id: "deepmind-rs-multimodal",
      company: "Google DeepMind",
      title: "Research Scientist, Multimodal LLMs, Google DeepMind",
      url: "https://boards.greenhouse.io/deepmind/jobs/6271356",
      evidence: "Research Scientist targeting multimodal LLM researchers. Locations include Tokyo and London. Experience with vision-language models and multimodal training/evaluation required.",
      evidenceLevel: "direct JD"
    },
    {
      id: "amazon-science",
      company: "Amazon",
      title: "Science roles for students and graduates",
      url: "https://amazon.jobs/content/en/career-programs/university/science",
      evidence: "Amazon names Applied Scientist, Data Scientist, and Research Scientist as student/graduate science roles. Applied Scientists design complete systems and support production-level projects.",
      evidenceLevel: "official program page"
    },
    {
      id: "apple-aiml",
      company: "Apple",
      title: "Machine Learning and AI jobs / Applied Research Engineer, Multimodal LLMs",
      url: "https://jobs.apple.com/en-us/details/200614666-3956/applied-research-engineer-multimodal-llms-for-human-interaction",
      evidence: "Explicit 'Applied Research Engineer - Multimodal LLMs for Human Interaction' JD. Requires MS + 2yr or PhD in CS/EE/related with AI/ML/CV focus. CVPR/NeurIPS publications. Fine-tuning/adapting multi-modal LLMs.",
      evidenceLevel: "direct JD"
    },
    {
      id: "microsoft-careers",
      company: "Microsoft",
      title: "Careers at Microsoft",
      url: "https://jobs.careers.microsoft.com/global/en/search",
      evidence: "Official careers page with Applied Scientist, Researcher, and Research Software Engineer roles. Dynamic rendering limits per-JD scraping; advanced degree or equivalent common for AI/research roles.",
      evidenceLevel: "official search page"
    },
    {
      id: "nvidia-careers",
      company: "NVIDIA",
      title: "NVIDIA New College Grad 2026 roles",
      url: "https://www.nvidia.com/en-us/about-nvidia/careers/",
      evidence: "Explicit 2026 new-grad postings: Research Scientist (Physical AI, PhD New College Grad), Systems Performance Engineer (Agentic AI), Deep Learning Computer Architect, ML Applications and Compiler Engineer. AI, AV, HPC, and robotics.",
      evidenceLevel: "official careers page"
    },
    {
      id: "openai-emerging",
      company: "OpenAI",
      title: "Emerging Talent",
      url: "https://openai.com/careers/emerging-talent/",
      evidence: "OpenAI states early-career full-time roles cover research, applied engineering, and product for people with 0-3 years of experience.",
      evidenceLevel: "official program page"
    },
    {
      id: "anthropic-careers",
      company: "Anthropic",
      title: "Careers at Anthropic — open roles",
      url: "https://www.anthropic.com/careers/jobs",
      evidence: "Live job list shows: Research Engineer/Scientist (Interpretability, Alignment Science, Honesty, Pre-training, Performance RL, Safeguards, Cybersecurity RL, Societal Impacts, Model Evaluations), ML Systems Engineer, Performance Engineer (GPU). About half technical staff hold PhDs.",
      evidenceLevel: "official careers page"
    },
    {
      id: "tiktok-careers",
      company: "TikTok",
      title: "Life at TikTok / Careers",
      url: "https://careers.tiktok.com/",
      evidence: "TikTok official careers navigation includes Engineering & Technology, Early Careers, Global Frontier Tech Recruitment, and PhD Opportunities.",
      evidenceLevel: "official careers page"
    },
    {
      id: "meta-careers",
      company: "Meta",
      title: "Meta Careers",
      url: "https://www.metacareers.com/jobs/",
      evidence: "Meta careers page was login-gated during this scrape. Research Engineer CV/Multimodal GenAI and AI Research Scientist VLLM roles verified via Greenhouse/Glassdoor. Inferred from Meta career taxonomy.",
      evidenceLevel: "limited access"
    },
    {
      id: "waymo-careers",
      company: "Waymo",
      title: "Waymo Careers",
      url: "https://waymo.com/careers/",
      evidence: "Waymo careers page not safely accessible in this scrape. Role inference based on official company focus: autonomous driving, perception, planning, simulation, and safety.",
      evidenceLevel: "limited access"
    },
    {
      id: "databricks-open",
      company: "Databricks",
      title: "Current job openings at Databricks",
      url: "https://www.databricks.com/company/careers/open-positions",
      evidence: "Official open positions show Machine Learning Engineer and PhD - Software Engineer roles among Databricks openings.",
      evidenceLevel: "official search page"
    },
    {
      id: "databricks-genai",
      company: "Databricks",
      title: "Senior GenAI Research Scientist — AI Efficiency & Optimization",
      url: "https://www.databricks.com/company/careers/engineering---pipeline/senior-genai-research-scientist---ai-efficiency--optimization-8540516002",
      evidence: "Role requires MS/PhD in CS or related field, ML/systems foundations, efficient Python/PyTorch research code, and first-author top ML/systems conference publications.",
      evidenceLevel: "direct JD"
    },
    {
      id: "databricks-backend",
      company: "Databricks",
      title: "Software Engineer — Backend",
      url: "https://www.databricks.com/company/careers/engineering---pipeline/software-engineer---backend-7737233002",
      evidence: "Backend role accepts 2+ years professional experience or alternatively a PhD degree, with backend systems and production operations responsibilities.",
      evidenceLevel: "direct JD"
    },
    {
      id: "scale-mlre-applied",
      company: "Scale AI",
      title: "Machine Learning Research Engineer, GenAI Applied ML",
      url: "https://job-boards.greenhouse.io/scaleai/jobs/4490301005",
      evidence: "Requires PhD or MSc; production ML systems; PyTorch/TF/JAX or scikit-learn; agentic LLM expertise; microservices; research depth with practical bias.",
      evidenceLevel: "direct JD"
    },
    {
      id: "scale-mlre-agents",
      company: "Scale AI",
      title: "Machine Learning Research Engineer, Agents — Enterprise GenAI",
      url: "https://job-boards.greenhouse.io/scaleai/jobs/4625344005",
      evidence: "Requires PhD or Masters; 1-3yr LLM production experience; post-training/RLHF/RLVR; recent NeurIPS/ICLR/ICML publications.",
      evidenceLevel: "direct JD"
    },
    {
      id: "scale-posttraining",
      company: "Scale AI",
      title: "Machine Learning Research Scientist, Post-Training",
      url: "https://scale.com/careers/4528009005",
      evidence: "PhD or Master's in CS/ML/AI; deep knowledge of RL and large-scale fine-tuning; RLHF, preference modeling, instruction tuning; publish at NeurIPS/ICML/ICLR/ACL/EMNLP/CVPR. Base salary $252-315K (SF/NY/Seattle).",
      evidenceLevel: "direct JD"
    },
    {
      id: "xai-careers",
      company: "xAI",
      title: "xAI Careers",
      url: "https://x.ai/careers",
      evidence: "Careers page lists featured roles including MTS Model Training, ML infrastructure networking, and exceptional software engineer. Visa sponsorship supported.",
      evidenceLevel: "official careers page"
    },
    {
      id: "xai-model-training",
      company: "xAI",
      title: "Member of Technical Staff — Model Training",
      url: "https://job-boards.greenhouse.io/xai/jobs/5086324007",
      evidence: "Focuses on critical modeling challenges, model usefulness, technical expertise, communication, and hands-on contribution. Not formally PhD-gated.",
      evidenceLevel: "direct JD"
    },
    {
      id: "xai-voice",
      company: "xAI",
      title: "Member of Technical Staff — Voice Model",
      url: "https://job-boards.greenhouse.io/xai/jobs/5051966007",
      evidence: "Speech data curation, speech-language pre/post-training, eval frameworks, product integration, Python, JAX/PyTorch, Spark/Ray, Kubernetes.",
      evidenceLevel: "direct JD"
    },
    {
      id: "tesla-ai",
      company: "Tesla",
      title: "AI Engineer, Foundation Models, Tesla AI",
      url: "https://www.tesla.com/careers/search/job/ai-engineer-foundation-models-tesla-ai-229689",
      evidence: "Enabling real-world intelligent systems for full autonomous driving and embedded intelligence.",
      evidenceLevel: "direct JD"
    },
    {
      id: "tesla-intern",
      company: "Tesla",
      title: "AI Engineering Intern, Summer 2026",
      url: "https://www.tesla.com/careers/search/job/ai-engineering-intern-summer-2026-259784",
      evidence: "Tesla seeks machine learning interns to build large-scale models for autonomy across current and future programs.",
      evidenceLevel: "direct JD"
    },
    {
      id: "tesla-optimus",
      company: "Tesla",
      title: "AI Engineer, Manipulation, Optimus",
      url: "https://www.tesla.com/careers/search/job/ai-engineer-manipulation-optimus-224501",
      evidence: "Develops learned robotic manipulation software stack and algorithms for Optimus.",
      evidenceLevel: "direct JD"
    },
    {
      id: "tesla-rl",
      company: "Tesla",
      title: "Reinforcement Learning Engineer, Self-Driving",
      url: "https://www.tesla.com/careers/search/job/reinforcement-learning-engineer-self-driving-221945",
      evidence: "Targets strong ML engineers building foundation models for robotics and autonomy.",
      evidenceLevel: "direct JD"
    },
    {
      id: "adobe-grad",
      company: "Adobe",
      title: "2026 University Graduate — Research Scientist/Engineer",
      url: "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced/job/XMLNAME-2026-University-Graduate---Research-Scientist-Engineer_R160690",
      evidence: "PhD degree and/or exceptional ability required; 2026 University Graduate Research Scientist/Engineer targeting new grads; research experience in music/audio AI and related fields.",
      evidenceLevel: "direct JD"
    },
    {
      id: "adobe-intern",
      company: "Adobe",
      title: "2026 Intern — Research Scientist / Engineer",
      url: "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced/job/Er--2026-Intern---Research-Scientist---Engineer_R162130",
      evidence: "Adobe Research intern role connects to PhD thesis work; areas include content intelligence, AI/ML, and computer vision.",
      evidenceLevel: "direct JD"
    },
    {
      id: "adobe-rs",
      company: "Adobe",
      title: "Research Scientist — applied research",
      url: "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced/job/Research-Scientist----applied-research-_R165284",
      evidence: "Applied research scientist role connecting ML/CV research to product teams.",
      evidenceLevel: "direct JD"
    },
    {
      id: "airbnb-intern",
      company: "Airbnb",
      title: "Internship Programs",
      url: "https://careers.airbnb.com/internship-programs/",
      evidence: "Airbnb internship page describes high-exposure projects; full-time conversion depends on performance and business need.",
      evidenceLevel: "official program page"
    },
    {
      id: "airbnb-reasoning",
      company: "Airbnb",
      title: "Principal AI/ML Researcher / Engineer in Reasoning, Planning, and Decision-making",
      url: "https://careers.airbnb.com/positions/7955573/",
      evidence: "Role covers LRM/LLM post-training, RL decisioning, knowledge-integrated agents, multi-agent systems, and production AI architecture.",
      evidenceLevel: "direct JD"
    },
    {
      id: "airbnb-ds",
      company: "Airbnb",
      title: "Senior Data Scientist — Causal Inference, Global Markets",
      url: "https://careers.airbnb.com/positions/7446449/",
      evidence: "PhD in related fields reduces requirement from 5+ years to 2+ years. Causal inference, experimentation, SQL, Python/R, and business translation.",
      evidenceLevel: "direct JD"
    },
    {
      id: "linkedin-reach",
      company: "LinkedIn",
      title: "Artificial Intelligence / Machine Learning Apprentice Engineer",
      url: "https://careers.linkedin.com/reach/AI",
      evidence: "LinkedIn REACH AI/ML track accepts undergraduate or graduate degree; emphasizes independent AI/ML projects and production engineering. Not eligible for visa sponsorship.",
      evidenceLevel: "official program page"
    },
    {
      id: "roblox-jobs",
      company: "Roblox",
      title: "Roblox careers job list",
      url: "https://careers.roblox.com/jobs",
      evidence: "Official list shows multiple 2026 Senior Machine Learning Engineer - PhD Early Career roles across AI Platform, Multimodal AI/CV/Graphics, Recommendation Systems, and Engine Optimization.",
      evidenceLevel: "official search page"
    },
    {
      id: "roblox-ai-platform",
      company: "Roblox",
      title: "Senior Machine Learning Engineer, AI Platform — PhD Early Career",
      url: "https://careers.roblox.com/jobs/7403998",
      evidence: "Roblox seeks exceptional PhD new graduates for AI Platform, distributed inference systems, and GenAI information retrieval.",
      evidenceLevel: "direct JD"
    },
    {
      id: "roblox-multimodal",
      company: "Roblox",
      title: "Senior Machine Learning Engineer, Multimodal AI, CV and Graphics — PhD Early Career",
      url: "https://careers.roblox.com/jobs/7323437",
      evidence: "Targets PhD candidates at the intersection of computer vision, graphics, generative modeling, applied research, and production impact.",
      evidenceLevel: "direct JD"
    },
    {
      id: "roblox-engine",
      company: "Roblox",
      title: "Senior Machine Learning Engineer, Engine Optimization — PhD Early Career",
      url: "https://careers.roblox.com/jobs/7421746",
      evidence: "Applies ML to real-time engine optimization, predictive resource allocation, content fetching, stability, visual quality, and content delivery.",
      evidenceLevel: "direct JD"
    }
  ]
};
