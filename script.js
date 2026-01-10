// Language switching functionality
document.addEventListener('DOMContentLoaded', () => {
    const langEnBtn = document.getElementById('lang-en');
    const langZhBtn = document.getElementById('lang-zh');
    const themeToggle = document.getElementById('theme-toggle');

    // Get saved preferences
    let currentLang = localStorage.getItem('preferred-lang') || 'en';
    let currentTheme = localStorage.getItem('preferred-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    // Initialize
    setLanguage(currentLang);
    setTheme(currentTheme);

    // Language toggle handlers
    langEnBtn.addEventListener('click', () => setLanguage('en'));
    langZhBtn.addEventListener('click', () => setLanguage('zh'));

    // Theme toggle handler
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(currentTheme);
    });

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('preferred-lang', lang);

        // Update button states
        langEnBtn.classList.toggle('active', lang === 'en');
        langZhBtn.classList.toggle('active', lang === 'zh');

        // Update HTML lang attribute
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

        // Update all translatable elements
        document.querySelectorAll('[data-en][data-zh]').forEach(el => {
            const text = lang === 'zh' ? el.dataset.zh : el.dataset.en;
            el.textContent = text;
        });
    }

    function setTheme(theme) {
        currentTheme = theme;
        localStorage.setItem('preferred-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }
});
