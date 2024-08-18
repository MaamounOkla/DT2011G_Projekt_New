// Globala animeringar

export function initAnimations() {
    // Variabler
    const nav = document.querySelector('nav');
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.querySelector('.nav');
    const images = document.querySelectorAll('img');

    // Responsive menu toggle
    menuToggle.addEventListener('click', () => {
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav');
                if (navMenu) {
                    navMenu.classList.toggle('active');
                }
            });
        }
    });

    // Animation för responsive nav slide up&down
    document.addEventListener('DOMContentLoaded', function () {
        let lastScrollY = window.scrollY;

        // Scroll event listener
        window.addEventListener('scroll', () => {
            if (window.scrollY > lastScrollY) {
                nav.classList.remove('slide-down');
                nav.classList.add('slide-up');
            } else {
                nav.classList.remove('slide-up');
                nav.classList.add('slide-down');
            }
            lastScrollY = window.scrollY;
        });

        // Menu eventlistener
        menuToggle.addEventListener('click', () => {
            if (navMenu.classList.contains('fade-in')) {
                navMenu.classList.remove('fade-in');
                navMenu.classList.add('fade-out');
                setTimeout(() => {
                    // Tiden för att ta bort active-classen 300 ms, samma tid som animeringen.  
                    navMenu.classList.remove('active');
                    navMenu.style.display = 'none';
                }, 300);
            } else {
                navMenu.classList.remove('fade-out');
                navMenu.classList.add('active');
                navMenu.style.display = 'flex';
                navMenu.classList.add('fade-in');
            }
        });
    });

}
