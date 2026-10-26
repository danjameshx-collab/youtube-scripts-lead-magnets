/* Shared behaviour for the script library.
   Once someone signs up on ANY page, we remember it in their browser, and every
   script card then opens its Gamma doc directly (no second signup). */
(function () {
    var KEY = 'lincko_scripts_unlocked';

    function isUnlocked() {
        try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
    }

    function markUnlocked() {
        try { localStorage.setItem(KEY, '1'); } catch (e) {}
    }

    function applyUnlocked() {
        if (!isUnlocked()) return;
        document.querySelectorAll('.script-card[data-gamma]').forEach(function (card) {
            card.href = card.getAttribute('data-gamma');
            card.target = '_blank';
            card.rel = 'noopener';
            var pill = card.querySelector('.card-pill');
            if (pill) pill.textContent = 'Unlocked';
            var label = card.querySelector('.card-cta-label');
            if (label) label.textContent = 'Open Script';
        });
        document.querySelectorAll('[data-unlocked-text]').forEach(function (el) {
            el.textContent = el.getAttribute('data-unlocked-text');
        });
        document.documentElement.classList.add('is-unlocked');
    }

    // Cursor-following glow on cards
    document.addEventListener('pointermove', function (e) {
        var card = e.target.closest && e.target.closest('.script-card');
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });

    window.LinckoScripts = { isUnlocked: isUnlocked, markUnlocked: markUnlocked, applyUnlocked: applyUnlocked };
    applyUnlocked();
})();
