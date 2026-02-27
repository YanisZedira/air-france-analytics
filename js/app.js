/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Application Controller
 * ============================================================================
 */

(function() {
    'use strict';

    const State = {
        currentPage: 'overview',
        filters: { year: 'all', type: 'all' },
        aircraft3D: null,
        initialized: false,
    };

    const PAGE_META = {
        overview: { title: 'Vue d\'ensemble', sub: 'Tableau de bord analytique' },
        network: { title: 'Réseau mondial', sub: 'Routes et destinations' },
        fleet: { title: 'Flotte & 3D', sub: 'Appareils et modèle 3D' },
        operations: { title: 'Ponctualité', sub: 'Performance opérationnelle' },
        revenue: { title: 'Revenus', sub: 'Analyse financière' },
        satisfaction: { title: 'Satisfaction', sub: 'Expérience passagers' },
        environment: { title: 'Environnement', sub: 'Impact carbone' },
    };

    const AIRCRAFT_SPECS = {
        a350: { range: '15 000 km', seats: '324', engine: 'Trent XWB', count: '18' },
        b777: { range: '13 650 km', seats: '468', engine: 'GE90-115B', count: '15' },
        a320: { range: '6 150 km', seats: '178', engine: 'CFM56-5B', count: '20' },
        b787: { range: '14 140 km', seats: '276', engine: 'GEnx-1B', count: '10' },
    };

    // ════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ════════════════════════════════════════════════════════════════════

    async function init() {
        console.log('✈️ Air France Analytics — Initializing...');

        updateLoader(0, 'Initialisation...');

        await DataStore.loadAll((progress, status) => {
            updateLoader(progress, status);
        });

        await sleep(400);

        document.getElementById('loader').classList.add('hidden');

        setupNavigation();
        setupFilters();
        setupTheme();
        setupMobileMenu();
        setupAircraftSelector();

        renderPage('overview');

        State.initialized = true;
        console.log('✅ Air France Analytics — Ready!');
    }

    function updateLoader(progress, status) {
        const bar = document.getElementById('loaderProgress');
        const text = document.getElementById('loaderText');
        if (bar) bar.style.width = `${progress}%`;
        if (text) text.textContent = status;
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ════════════════════════════════════════════════════════════════════

    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page && page !== State.currentPage) {
                    navigateTo(page);
                }
                // Close mobile menu
                document.getElementById('sidebar').classList.remove('open');
            });
        });
    }

    function navigateTo(page) {
        // Update nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
            pageEl.style.animation = 'none';
            pageEl.offsetHeight;
            pageEl.style.animation = '';
        }

        // Update header
        const meta = PAGE_META[page];
        if (meta) {
            document.getElementById('pageTitle').textContent = meta.title;
            document.getElementById('pageSub').textContent = meta.sub;
        }

        State.currentPage = page;
        renderPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ════════════════════════════════════════════════════════════════════
    // FILTERS
    // ════════════════════════════════════════════════════════════════════

    function setupFilters() {
        document.getElementById('filterYear')?.addEventListener('change', (e) => {
            State.filters.year = e.target.value;
            renderPage(State.currentPage);
        });

        document.getElementById('filterType')?.addEventListener('change', (e) => {
            State.filters.type = e.target.value;
            renderPage(State.currentPage);
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // THEME
    // ════════════════════════════════════════════════════════════════════

    function setupTheme() {
        const toggle = document.getElementById('themeToggle');
        const saved = localStorage.getItem('af-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeBtn(saved);

        toggle?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('af-theme', next);
            updateThemeBtn(next);
            setTimeout(() => renderPage(State.currentPage), 100);
        });
    }

    function updateThemeBtn(theme) {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.innerHTML = theme === 'dark' 
                ? '<i class="fas fa-moon"></i><span>Mode sombre</span>'
                : '<i class="fas fa-sun"></i><span>Mode clair</span>';
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // MOBILE MENU
    // ════════════════════════════════════════════════════════════════════

    function setupMobileMenu() {
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        document.getElementById('main')?.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // AIRCRAFT SELECTOR
    // ════════════════════════════════════════════════════════════════════

    function setupAircraftSelector() {
        const select = document.getElementById('aircraftSelect');
        if (!select) return;

        select.addEventListener('change', () => {
            const type = select.value;
            const spec = AIRCRAFT_SPECS[type];

            if (spec) {
                document.getElementById('spec-range').textContent = spec.range;
                document.getElementById('spec-seats').textContent = spec.seats;
                document.getElementById('spec-engine').textContent = spec.engine;
                document.getElementById('spec-count').textContent = spec.count;
            }

            if (aircraft3DInstance) {
                aircraft3DInstance.switchModel(type);
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // PAGE RENDERING
    // ════════════════════════════════════════════════════════════════════

    function renderPage(page) {
        if (!DataStore.loaded) return;

        const flights = DataStore.filter(State.filters.year, State.filters.type);
        const satisfaction = DataStore.filterSatisfaction(State.filters.year, State.filters.type);
        const airports = DataStore.airports;
        const fleet = DataStore.fleet;

        switch (page) {
            case 'overview':
                Charts.renderOverviewKPIs(flights);
                Charts.renderTrend(flights);
                Charts.renderCourrier(flights);
                Charts.renderDestinations(flights);
                Charts.renderContinents(flights);
                Charts.renderHeatmap(flights);
                Charts.renderLoadFactor(flights);
                break;

            case 'network':
                Charts.renderNetworkKPIs(flights, airports);
                Charts.renderMap(flights, airports);
                Charts.renderTraffic(flights);
                Charts.renderDistances(flights);
                break;

            case 'fleet':
                Charts.renderFleetKPIs(fleet);
                Charts.renderFleetComp(fleet);
                Charts.renderFleetAge(fleet);
                Charts.renderFleetUse(flights);
                Charts.renderFleetType(fleet);
                initAircraft3D();
                break;

            case 'operations':
                Charts.renderOpsKPIs(flights);
                Charts.renderOTP(flights);
                Charts.renderCauses(flights);
                Charts.renderDelayDist(flights);
                Charts.renderOTPAircraft(flights);
                Charts.renderDelayHeat(flights);
                break;

            case 'revenue':
                Charts.renderRevenueKPIs(flights);
                Charts.renderRevMonthly(flights);
                Charts.renderRevType(flights);
                Charts.renderYield(flights);
                Charts.renderRevScatter(flights);
                Charts.renderTopRoutes(flights);
                break;

            case 'satisfaction':
                Charts.renderSatKPIs(satisfaction);
                Charts.renderRadar(satisfaction);
                Charts.renderNPS(satisfaction);
                Charts.renderSatClass(satisfaction);
                Charts.renderSatFidelity(satisfaction);
                Charts.renderSatTrend(satisfaction);
                Charts.renderSatTraveler(satisfaction);
                break;

            case 'environment':
                Charts.renderEnvKPIs(flights);
                Charts.renderEnvCO2(flights);
                Charts.renderEnvAircraft(flights);
                Charts.renderEnvFuel(flights);
                Charts.renderEnvScatter(flights);
                break;
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // RESIZE
    // ════════════════════════════════════════════════════════════════════

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.querySelectorAll('.card-body').forEach(el => {
                if (el.data) Plotly.Plots.resize(el);
            });
        }, 250);
    });

    // ════════════════════════════════════════════════════════════════════
    // BOOT
    // ════════════════════════════════════════════════════════════════════

    document.addEventListener('DOMContentLoaded', init);

})();
