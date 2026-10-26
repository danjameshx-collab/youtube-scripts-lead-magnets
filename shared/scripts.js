/* Shared behaviour for the script library.
   Cards always lead to each script's own landing page, so nobody gets a script
   without giving their details. The only exception: right after someone signs up
   on /scripts, the cards on that page open the scripts directly (this visit only,
   nothing is remembered). */
(function () {
    var unlocked = false;

    // Clear the old "remembered signup" flag from earlier versions of the site.
    try { localStorage.removeItem('lincko_scripts_unlocked'); } catch (e) {}

    function isUnlocked() { return unlocked; }

    function markUnlocked() { unlocked = true; }

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
})();
