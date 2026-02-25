/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Main Application Controller
 * ============================================================================
 */

(function () {
    'use strict';

    const State = {
        currentPage: 'overview',
        filters: { year: 'all', courrier: 'all' },
        aircraft3D: null,
        globe3D: null,
        initialized: false,
    };

    const PAGE_META = {
        overview: { title: 'Vue d\'ensemble', breadcrumb: 'Tableau de bord › Vue d\'ensemble' },
        network: { title: 'Réseau & Routes', breadcrumb: 'Tableau de bord › Réseau mondial' },
        fleet: { title: 'Flotte & Avion 3D', breadcrumb: 'Opérations › Flotte aérienne' },
        operations: { title: 'Ponctualité', breadcrumb: 'Opérations › Performance' },
        revenue: { title: 'Revenus & Yield', breadcrumb: 'Business › Analyse financière' },
        satisfaction: { title: 'Satisfaction Client', breadcrumb: 'Business › Expérience passagers' },
        environment: { title: 'Empreinte Carbone', breadcrumb: 'Durabilité › Impact environnemental' },
    };

    // ================================================================
    // INITIALIZATION
    // ================================================================
    async function init() {
        console.log('✈️ Air France Analytics — Initializing...');

        updateLoader(0, 'Initialisation...');

        await DataStore.loadAll((progress, status) => {
            updateLoader(progress, status);
        });

        await sleep(300);
        document.getElementById('loader').classList.add('hidden');

        setupNavigation();
        setupFilters();
        setupThemeToggle();
        setupSidebarToggle();
        setupAircraftSelector();

        renderPage('overview');

        State.initialized = true;
        console.log('✅ Air France Analytics — Ready!');
    }

    function updateLoader(progress, status) {
        const bar = document.getElementById('loaderBar');
        const text = document.getElementById('loaderStatus');
        if (bar) bar.style.width = `${Math.min(progress, 100)}%`;
        if (text) text.textContent = status;
    }

    // ================================================================
    // NAVIGATION
    // ================================================================
    function setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page && page !== State.currentPage) {
                    navigateTo(page);
                }
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });
    }

    function navigateTo(page) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
            pageEl.style.animation = 'none';
            pageEl.offsetHeight;
            pageEl.style.animation = '';
        }

        const meta = PAGE_META[page];
        if (meta) {
            document.getElementById('pageTitle').textContent = meta.title;
            document.getElementById('pageBreadcrumb').textContent = meta.breadcrumb;
        }

        State.currentPage = page;
        renderPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ================================================================
    // FILTERS
    // ================================================================
    function setupFilters() {
        document.getElementById('filterYear').addEventListener('change', (e) => {
            State.filters.year = e.target.value;
            renderPage(State.currentPage);
        });

        document.getElementById('filterCourrier').addEventListener('change', (e) => {
            State.filters.courrier = e.target.value;
            renderPage(State.currentPage);
        });
    }

    // ================================================================
    // THEME TOGGLE
    // ================================================================
    function setupThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('af-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('af-theme', next);
            updateThemeIcon(next);
            setTimeout(() => renderPage(State.currentPage), 100);
        });
    }

    function updateThemeIcon(theme) {
        const toggle = document.getElementById('themeToggle');
        toggle.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-moon"></i><span>Mode sombre</span>'
            : '<i class="fas fa-sun"></i><span>Mode clair</span>';
    }

    // ================================================================
    // SIDEBAR TOGGLE
    // ================================================================
    function setupSidebarToggle() {
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        document.getElementById('mainContent').addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    }

    // ================================================================
    // AIRCRAFT SELECTOR
    // ================================================================
    function setupAircraftSelector() {
        const select = document.getElementById('aircraftSelect');
        if (!select) return;

        const SPECS = {
            a350: { range: '15 000 km', seats: '324', engine: 'Trent XWB', count: '18' },
            b777: { range: '13 650 km', seats: '468', engine: 'GE90-115B', count: '15' },
            a320: { range: '6 150 km', seats: '178', engine: 'CFM56-5B', count: '20' },
            b787: { range: '14 140 km', seats: '276', engine: 'GEnx-1B', count: '10' },
            a330: { range: '13 450 km', seats: '224', engine: 'CF6-80E1', count: '10' },
        };

        select.addEventListener('change', () => {
            const type = select.value;
            const spec = SPECS[type];

            if (spec) {
                document.getElementById('spec-range').textContent = spec.range;
                document.getElementById('spec-seats').textContent = spec.seats;
                document.getElementById('spec-engine').textContent = spec.engine;
                document.getElementById('spec-count').textContent = spec.count;
            }

            if (State.aircraft3D) {
                State.aircraft3D.switchAircraft(type);
            }
        });
    }

    // ================================================================
    // PAGE RENDERING
    // ================================================================
    function renderPage(page) {
        if (!DataStore.loaded) return;

        const flights = DataStore.getFilteredFlights(State.filters.year, State.filters.courrier);
        const satisfaction = DataStore.getFilteredSatisfaction(State.filters.year, State.filters.courrier);
        const airports = DataStore.airports;
        const fleet = DataStore.fleet;

        switch (page) {
            case 'overview':
                Charts.renderOverviewKPIs(flights);
                Charts.renderMonthlyTrend(flights);
                Charts.renderCourrierDonut(flights);
                Charts.renderTopDestinations(flights);
                Charts.renderContinentPerf(flights);
                Charts.renderHeatmapFlights(flights);
                Charts.renderLoadFactorTrend(flights);
                break;

            case 'network':
                Charts.renderNetworkKPIs(flights, airports);
                Charts.renderWorldMap(flights, airports);
                initGlobe3D(flights, airports);
                Charts.renderTrafficContinent(flights);
                Charts.renderDistanceDistribution(flights);
                break;

            case 'fleet':
                Charts.renderFleetKPIs(fleet);
                Charts.renderFleetComposition(fleet);
                Charts.renderFleetAge(fleet);
                Charts.renderFleetUtilization(flights);
                Charts.renderFleetFamily(fleet);
                initAircraft3D();
                break;

            case 'operations':
                Charts.renderOpsKPIs(flights);
                Charts.renderOTPMonthly(flights);
                Charts.renderDelayCauses(flights);
                Charts.renderDelayDistribution(flights);
                Charts.renderOTPByAircraft(flights);
                Charts.renderDelayHeatmap(flights);
                break;

            case 'revenue':
                Charts.renderRevenueKPIs(flights);
                Charts.renderRevenueMonthly(flights);
                Charts.renderRevenueCourrier(flights);
                Charts.renderYieldContinent(flights);
                Charts.renderRevenueScatter(flights);
                Charts.renderTopRoutesRevenue(flights);
                break;

            case 'satisfaction':
                Charts.renderSatisfactionKPIs(satisfaction);
                Charts.renderSatisfactionRadar(satisfaction);
                Charts.renderNPSDistribution(satisfaction);
                Charts.renderSatisfactionByClass(satisfaction);
                Charts.renderSatisfactionByFidelity(satisfaction);
                Charts.renderSatisfactionTrend(satisfaction);
                Charts.renderSatisfactionByTraveler(satisfaction);
                break;

            case 'environment':
                Charts.renderEnvironmentKPIs(flights);
                Charts.renderCO2Monthly(flights);
                Charts.renderCO2ByAircraft(flights);
                Charts.renderFuelCourrier(flights);
                Charts.renderCO2Scatter(flights);
                break;
        }
    }

    // ================================================================
    // INIT 3D VIEWERS
    // ================================================================
    function initAircraft3D() {
        if (State.aircraft3D) return;
        setTimeout(() => {
            State.aircraft3D = new Aircraft3DViewer('aircraft3d');
        }, 200);
    }

    function initGlobe3D(flights, airports) {
        const container = document.getElementById('globe-3d-container');
        if (!container || State.globe3D) return;

        // Agréger les routes
        const routeAgg = {};
        flights.forEach(f => {
            const key = `${f.aeroport_depart}-${f.aeroport_arrivee}`;
            if (!routeAgg[key]) {
                routeAgg[key] = { dep: f.aeroport_depart, arr: f.aeroport_arrivee, count: 0 };
            }
            routeAgg[key].count++;
        });

        const routes = Object.values(routeAgg);

        setTimeout(() => {
            State.globe3D = new GlobeViewer('globe-3d-container', airports, routes);
        }, 300);
    }

    // ================================================================
    // UTILITIES
    // ================================================================
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ================================================================
    // RESIZE
    // ================================================================
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            document.querySelectorAll('.chart-body').forEach(el => {
                if (el.data) Plotly.Plots.resize(el);
            });
        }, 200);
    });

    // ================================================================
    // BOOT
    // ================================================================
    document.addEventListener('DOMContentLoaded', init);

})();
