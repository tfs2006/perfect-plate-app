document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- Simple Client-Side Router ---
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.router-link');
    const headerNavLinks = document.querySelectorAll('header .router-link');

    async function loadContent(route) {
        // Default to 'home' if route is empty
        const page = route || 'home';
        const filePath = `pages/${page}.html`;

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                // If a page isn't found, load the home page as a fallback
                console.error(`Page not found: ${filePath}. Loading home page.`);
                await loadContent('home');
                window.location.hash = 'home'; // Also update the URL hash
                return;
            }
            const html = await response.text();
            mainContent.innerHTML = html;
            
            // Re-initialize icons and router links for the newly loaded content
            lucide.createIcons();
            addClickListenersToRouterLinks();

        } catch (error) {
            console.error('Error loading page:', error);
            mainContent.innerHTML = `<div class="text-center text-red-500">Failed to load content. Please try again.</div>`;
        }
    }

    function router() {
        const route = window.location.hash.substring(1);
        loadContent(route);
        updateActiveNavLink();
        window.scrollTo(0, 0); // Scroll to top on page change
    }

    function updateActiveNavLink() {
        const currentRoute = window.location.hash || '#home';
        
        // Handle main navigation links
        headerNavLinks.forEach(link => {
            const linkRoute = link.getAttribute('href');
            // Special case for pillar page link
            if (linkRoute === '#pillar' && currentRoute === '#pillar') {
                 link.classList.add('nav-link-active');
            } else if (linkRoute === currentRoute) {
                 link.classList.add('nav-link-active');
            }
            else {
                link.classList.remove('nav-link-active');
            }
        });

        // Close mobile menu on navigation
        if (!mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
    }

    function addClickListenersToRouterLinks() {
        // We need to re-query for links inside the newly loaded mainContent
        const allRouterLinks = document.querySelectorAll('.router-link');
        allRouterLinks.forEach(link => {
            // Prevent adding duplicate listeners
            if (!link.dataset.listenerAttached) {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    // Only prevent default for internal hash links
                    if (href.startsWith('#')) {
                        e.preventDefault();
                        window.location.hash = href;
                    }
                });
                link.dataset.listenerAttached = 'true';
            }
        });
    }

    // Listen for hash changes to route
    window.addEventListener('hashchange', router);

    // Initial load
    router();
    addClickListenersToRouterLinks();
});
