/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Charts Engine (Plotly)
 * ============================================================================
 */

const AF_COLORS = {
    navy: '#002157',
    navyLight: '#003580',
    red: '#E4002B',
    gold: '#C4A265',
    sky: '#6BAADB',
    skyLight: '#8ec4f0',
    green: '#10b981',
    palette: ['#002157', '#E4002B', '#C4A265', '#6BAADB', '#10b981', '#a78bfa', '#f97316', '#8ec4f0'],
};

function getTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: 'Inter, sans-serif',
            color: isDark ? '#8899aa' : '#4a5568',
            size: 12,
        },
        xaxis: {
            gridcolor: isDark ? 'rgba(107,170,219,0.06)' : 'rgba(0,33,87,0.08)',
            linecolor: isDark ? 'rgba(107,170,219,0.1)' : 'rgba(0,33,87,0.1)',
            zerolinecolor: isDark ? 'rgba(107,170,219,0.08)' : 'rgba(0,33,87,0.08)',
        },
        yaxis: {
            gridcolor: isDark ? 'rgba(107,170,219,0.06)' : 'rgba(0,33,87,0.08)',
            linecolor: isDark ? 'rgba(107,170,219,0.1)' : 'rgba(0,33,87,0.1)',
            zerolinecolor: isDark ? 'rgba(107,170,219,0.08)' : 'rgba(0,33,87,0.08)',
        },
        margin: { l: 50, r: 20, t: 30, b: 50 },
        hoverlabel: {
            bgcolor: isDark ? '#0d1320' : '#ffffff',
            bordercolor: isDark ? '#333' : '#ddd',
            font: { family: 'Inter', size: 13, color: isDark ? '#f0f4f8' : '#0a0f1a' },
        },
    };
}

const plotConfig = { displayModeBar: false, responsive: true };

function formatNum(n, decimals = 0) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' Md';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' k';
    return n.toFixed(decimals);
}

const Charts = {

    // ════════════════════════════════════════════════════════════════════
    // OVERVIEW
    // ════════════════════════════════════════════════════════════════════

    renderOverviewKPIs(flights) {
        const total = flights.length;
        const pax = DataStore.sum(flights, 'passagers');
        const revenue = DataStore.sum(flights, 'revenu_vol_eur');
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const otp = nonCancelled.filter(f => f.retard_depart_min <= 15).length / nonCancelled.length * 100;
        const loadFactor = DataStore.avg(flights, 'taux_remplissage') * 100;
        const rpk = DataStore.sum(flights, 'rpk');
        const co2 = DataStore.sum(flights, 'co2_tonnes');
        const co2PerPaxKm = rpk > 0 ? (co2 * 1e6 / rpk) : 0;

        document.getElementById('kpi-flights').textContent = formatNum(total);
        document.getElementById('kpi-pax').textContent = formatNum(pax);
        document.getElementById('kpi-revenue').textContent = formatNum(revenue) + '€';
        document.getElementById('kpi-otp').textContent = otp.toFixed(1) + '%';
        document.getElementById('kpi-load').textContent = loadFactor.toFixed(1) + '%';
        document.getElementById('kpi-co2').textContent = co2PerPaxKm.toFixed(1) + 'g';
    },

    renderTrend(flights) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();

        const trace = {
            x: months,
            y: months.map(m => grouped[m].length),
            type: 'scatter',
            mode: 'lines+markers',
            fill: 'tozeroy',
            fillcolor: 'rgba(0, 33, 87, 0.1)',
            line: { color: AF_COLORS.navy, width: 3, shape: 'spline' },
            marker: { size: 5, color: AF_COLORS.navy },
        };

        const layout = { ...getTheme(), hovermode: 'x unified' };
        Plotly.newPlot('chart-trend', [trace], layout, plotConfig);
    },

    renderCourrier(flights) {
        const grouped = DataStore.groupBy(flights, f => f.courrier);
        const labels = Object.keys(grouped);
        const values = labels.map(l => grouped[l].length);

        const trace = {
            labels, values,
            type: 'pie',
            hole: 0.6,
            marker: { colors: [AF_COLORS.navy, AF_COLORS.red, AF_COLORS.gold] },
            textinfo: 'percent',
            textfont: { size: 13 },
        };

        const layout = {
            ...getTheme(),
            showlegend: true,
            legend: { orientation: 'h', y: -0.1 },
            annotations: [{
                text: `<b>${formatNum(flights.length)}</b><br>vols`,
                showarrow: false,
                font: { size: 15, color: getTheme().font.color },
            }],
        };

        Plotly.newPlot('chart-courrier', [trace], layout, plotConfig);
    },

    renderDestinations(flights) {
        const grouped = DataStore.groupBy(flights, f => f.aeroport_arrivee);
        const sorted = Object.entries(grouped)
            .map(([k, v]) => ({ dest: k, pax: DataStore.sum(v, 'passagers') }))
            .sort((a, b) => b.pax - a.pax)
            .slice(0, 10)
            .reverse();

        const trace = {
            y: sorted.map(d => d.dest),
            x: sorted.map(d => d.pax),
            type: 'bar',
            orientation: 'h',
            marker: {
                color: sorted.map((_, i) => `rgba(0, 33, 87, ${0.3 + (i / 10) * 0.7})`),
            },
            text: sorted.map(d => formatNum(d.pax)),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-destinations', [trace], getTheme(), plotConfig);
    },

    renderContinents(flights) {
        const grouped = DataStore.groupBy(flights, f => f.continent_destination || 'Autre');
        const data = Object.entries(grouped)
            .map(([c, items]) => ({
                continent: c,
                revenue: DataStore.sum(items, 'revenu_vol_eur'),
                load: DataStore.avg(items, 'taux_remplissage') * 100,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        const traces = [
            {
                x: data.map(d => d.continent),
                y: data.map(d => d.revenue),
                type: 'bar',
                name: 'Revenus',
                marker: { color: AF_COLORS.navy, opacity: 0.85 },
            },
            {
                x: data.map(d => d.continent),
                y: data.map(d => d.load),
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Remplissage %',
                yaxis: 'y2',
                line: { color: AF_COLORS.red, width: 3 },
                marker: { size: 7, color: AF_COLORS.red },
            },
        ];

        const layout = {
            ...getTheme(),
            yaxis: { ...getTheme().yaxis, title: 'Revenus (€)' },
            yaxis2: { ...getTheme().yaxis, title: 'Remplissage %', overlaying: 'y', side: 'right', range: [60, 100] },
            legend: { orientation: 'h', y: 1.1 },
            hovermode: 'x unified',
        };

        Plotly.newPlot('chart-continents', traces, layout, plotConfig);
    },

    renderHeatmap(flights) {
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const hours = Array.from({ length: 18 }, (_, i) => i + 5);

        const grid = Array(7).fill(null).map(() => Array(18).fill(0));
        flights.forEach(f => {
            const h = f._hour - 5;
            if (h >= 0 && h < 18 && f._dayOfWeek >= 0 && f._dayOfWeek < 7) {
                grid[f._dayOfWeek][h]++;
            }
        });

        const trace = {
            z: grid,
            x: hours.map(h => `${h}h`),
            y: days,
            type: 'heatmap',
            colorscale: [
                [0, 'rgba(0, 33, 87, 0.05)'],
                [0.5, 'rgba(107, 170, 219, 0.4)'],
                [1, 'rgba(228, 0, 43, 0.9)'],
            ],
            hovertemplate: '%{y} %{x}: %{z} vols<extra></extra>',
            showscale: true,
            colorbar: { thickness: 12, len: 0.8 },
        };

        Plotly.newPlot('chart-heatmap', [trace], { ...getTheme(), height: 280 }, plotConfig);
    },

    renderLoadFactor(flights) {
        const courriers = ['Court-courrier', 'Moyen-courrier', 'Long-courrier'];
        const colors = [AF_COLORS.navy, AF_COLORS.red, AF_COLORS.gold];

        const traces = courriers.map((c, i) => {
            const cFlights = flights.filter(f => f.courrier === c);
            const grouped = DataStore.groupBy(cFlights, f => f._yearMonth);
            const months = Object.keys(grouped).sort();
            return {
                x: months,
                y: months.map(m => DataStore.avg(grouped[m], 'taux_remplissage') * 100),
                type: 'scatter',
                mode: 'lines',
                name: c,
                line: { color: colors[i], width: 2.5, shape: 'spline' },
            };
        });

        const layout = {
            ...getTheme(),
            yaxis: { ...getTheme().yaxis, title: 'Remplissage %', range: [60, 100] },
            legend: { orientation: 'h', y: 1.1 },
            hovermode: 'x unified',
        };

        Plotly.newPlot('chart-loadfactor', traces, layout, plotConfig);
    },

    // ════════════════════════════════════════════════════════════════════
    // NETWORK
    // ════════════════════════════════════════════════════════════════════

    renderNetworkKPIs(flights, airports) {
        const destinations = new Set(flights.map(f => f.aeroport_arrivee));
        const routes = new Set(flights.map(f => `${f.aeroport_depart}-${f.aeroport_arrivee}`));
        const countries = new Set(airports.filter(a => destinations.has(a.code_iata)).map(a => a.pays));
        const avgDist = DataStore.avg(flights, 'distance_km');

        document.getElementById('net-dest').textContent = destinations.size;
        document.getElementById('net-routes').textContent = routes.size;
        document.getElementById('net-pays').textContent = countries.size;
        document.getElementById('net-dist').textContent = formatNum(avgDist) + ' km';
    },

    renderMap(flights, airports) {
        const airportMap = {};
        airports.forEach(a => { airportMap[a.code_iata] = a; });

        // Aggregate routes
        const routeAgg = {};
        flights.forEach(f => {
            const key = `${f.aeroport_depart}-${f.aeroport_arrivee}`;
            if (!routeAgg[key]) routeAgg[key] = { dep: f.aeroport_depart, arr: f.aeroport_arrivee, count: 0 };
            routeAgg[key].count++;
        });
        const routes = Object.values(routeAgg);

        // Traffic per airport
        const traffic = {};
        flights.forEach(f => {
            traffic[f.aeroport_depart] = (traffic[f.aeroport_depart] || 0) + 1;
            traffic[f.aeroport_arrivee] = (traffic[f.aeroport_arrivee] || 0) + 1;
        });

        // Route lines
        const routeTraces = [];
        const maxCount = Math.max(...routes.map(r => r.count));

        routes.forEach(r => {
            const a1 = airportMap[r.dep];
            const a2 = airportMap[r.arr];
            if (!a1 || !a2) return;

            const intensity = r.count / maxCount;

            routeTraces.push({
                type: 'scattergeo',
                lon: [a1.longitude, a2.longitude],
                lat: [a1.latitude, a2.latitude],
                mode: 'lines',
                line: {
                    width: 0.8 + intensity * 2.5,
                    color: `rgba(0, 33, 87, ${0.15 + intensity * 0.45})`,
                },
                hoverinfo: 'text',
                text: `${r.dep} → ${r.arr}<br>${r.count} vols`,
                showlegend: false,
            });
        });

        // Airport points
        const usedAirports = airports.filter(a => traffic[a.code_iata]);
        const maxTraffic = Math.max(...usedAirports.map(a => traffic[a.code_iata] || 0));

        const airportTrace = {
            type: 'scattergeo',
            lon: usedAirports.map(a => a.longitude),
            lat: usedAirports.map(a => a.latitude),
            mode: 'markers+text',
            marker: {
                size: usedAirports.map(a => 5 + (traffic[a.code_iata] || 0) / maxTraffic * 15),
                color: usedAirports.map(a => a.type_aeroport === 'Hub' ? AF_COLORS.red : AF_COLORS.navy),
                opacity: 0.85,
            },
            text: usedAirports.map(a => a.code_iata),
            textposition: 'top center',
            textfont: { size: 9 },
            hovertext: usedAirports.map(a => `<b>${a.code_iata}</b> — ${a.nom}<br>${a.ville}, ${a.pays}`),
            hoverinfo: 'text',
            showlegend: false,
        };

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        const layout = {
            ...getTheme(),
            geo: {
                projection: { type: 'natural earth' },
                showland: true,
                landcolor: isDark ? '#1a2030' : '#f0f4f8',
                showocean: true,
                oceancolor: isDark ? '#0d1220' : '#e8f0fe',
                showcountries: true,
                countrycolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                showcoastlines: true,
                coastlinecolor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                showframe: false,
                bgcolor: 'rgba(0,0,0,0)',
                lonaxis: { range: [-130, 160] },
                lataxis: { range: [-50, 70] },
            },
            margin: { l: 0, r: 0, t: 0, b: 0 },
            height: 420,
        };

        Plotly.newPlot('chart-map', [...routeTraces, airportTrace], layout, plotConfig);
    },

    renderTraffic(flights) {
        const grouped = DataStore.groupBy(flights, f => f.continent_destination || 'Autre');
        const data = Object.entries(grouped)
            .map(([c, items]) => ({ continent: c, pax: DataStore.sum(items, 'passagers') }))
            .sort((a, b) => b.pax - a.pax);

        const trace = {
            labels: data.map(d => d.continent),
            values: data.map(d => d.pax),
            type: 'pie',
            hole: 0.5,
            marker: { colors: AF_COLORS.palette },
            textinfo: 'percent+label',
            textfont: { size: 11 },
        };

        Plotly.newPlot('chart-traffic', [trace], { ...getTheme(), showlegend: false }, plotConfig);
    },

    renderDistances(flights) {
        const trace = {
            x: flights.map(f => f.distance_km),
            type: 'histogram',
            nbinsx: 40,
            marker: { color: AF_COLORS.navy, opacity: 0.75 },
        };

        const layout = {
            ...getTheme(),
            xaxis: { ...getTheme().xaxis, title: 'Distance (km)' },
            yaxis: { ...getTheme().yaxis, title: 'Nombre de vols' },
        };

        Plotly.newPlot('chart-distances', [trace], layout, plotConfig);
    },

    // ════════════════════════════════════════════════════════════════════
    // FLEET
    // ════════════════════════════════════════════════════════════════════

    renderFleetKPIs(fleet) {
        document.getElementById('fleet-total').textContent = fleet.length;
        document.getElementById('fleet-types').textContent = new Set(fleet.map(a => a.type_avion)).size;
        document.getElementById('fleet-age').textContent = DataStore.avg(fleet, 'age_avion_ans').toFixed(1) + ' ans';
        document.getElementById('fleet-seats').textContent = formatNum(DataStore.sum(fleet, 'nb_sieges_total'));
    },

    renderFleetComp(fleet) {
        const grouped = DataStore.groupBy(fleet, a => a.type_avion);
        const data = Object.entries(grouped)
            .map(([type, items]) => ({ type, count: items.length }))
            .sort((a, b) => b.count - a.count);

        const trace = {
            y: data.map(d => d.type),
            x: data.map(d => d.count),
            type: 'bar',
            orientation: 'h',
            marker: { color: AF_COLORS.palette },
            text: data.map(d => d.count),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-fleet-comp', [trace], getTheme(), plotConfig);
    },

    renderFleetAge(fleet) {
        const bins = ['0-5 ans', '5-10 ans', '10-15 ans', '15-20 ans', '20+ ans'];
        const counts = [0, 0, 0, 0, 0];
        fleet.forEach(a => {
            const age = a.age_avion_ans;
            if (age < 5) counts[0]++;
            else if (age < 10) counts[1]++;
            else if (age < 15) counts[2]++;
            else if (age < 20) counts[3]++;
            else counts[4]++;
        });

        const trace = {
            x: bins,
            y: counts,
            type: 'bar',
            marker: {
                color: [AF_COLORS.sky, AF_COLORS.navyLight, AF_COLORS.navy, AF_COLORS.gold, AF_COLORS.red],
            },
            text: counts,
            textposition: 'outside',
        };

        Plotly.newPlot('chart-fleet-age', [trace], getTheme(), plotConfig);
    },

    renderFleetUse(flights) {
        const grouped = DataStore.groupBy(flights, f => f.type_avion);
        const monthCount = new Set(flights.map(f => f._yearMonth)).size || 1;

        const data = Object.entries(grouped)
            .map(([type, items]) => ({ type, perMonth: Math.round(items.length / monthCount) }))
            .sort((a, b) => b.perMonth - a.perMonth);

        const trace = {
            x: data.map(d => d.type),
            y: data.map(d => d.perMonth),
            type: 'bar',
            marker: { color: AF_COLORS.navy, opacity: 0.85 },
            text: data.map(d => d.perMonth),
            textposition: 'outside',
        };

        const layout = {
            ...getTheme(),
            xaxis: { ...getTheme().xaxis, tickangle: -30 },
        };

        Plotly.newPlot('chart-fleet-use', [trace], layout, plotConfig);
    },

    renderFleetType(fleet) {
        const grouped = DataStore.groupBy(fleet, a => a.famille);
        const trace = {
            labels: Object.keys(grouped),
            values: Object.values(grouped).map(v => v.length),
            type: 'pie',
            hole: 0.6,
            marker: { colors: [AF_COLORS.navy, AF_COLORS.gold] },
            textinfo: 'percent+label',
        };

        Plotly.newPlot('chart-fleet-type', [trace], { ...getTheme(), showlegend: false }, plotConfig);
    },

    // ════════════════════════════════════════════════════════════════════
    // OPERATIONS
    // ════════════════════════════════════════════════════════════════════

    renderOpsKPIs(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const otp = nonCancelled.filter(f => f.retard_depart_min <= 15).length / nonCancelled.length * 100;
        const avgDelay = DataStore.avg(nonCancelled, 'retard_depart_min');
        const cancelRate = flights.filter(f => f.statut_vol === 'Annulé').length / flights.length * 100;

        document.getElementById('ops-otp').textContent = otp.toFixed(1) + '%';
        document.getElementById('ops-delay').textContent = avgDelay.toFixed(0) + ' min';
        document.getElementById('ops-cancel').textContent = cancelRate.toFixed(2) + '%';
        document.getElementById('ops-complete').textContent = (100 - cancelRate).toFixed(1) + '%';
    },

    renderOTP(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const grouped = DataStore.groupBy(nonCancelled, f => f._yearMonth);
        const months = Object.keys(grouped).sort();

        const otp = months.map(m => {
            const items = grouped[m];
            return items.filter(f => f.retard_depart_min <= 15).length / items.length * 100;
        });

        const traces = [
            {
                x: months, y: otp,
                type: 'scatter', mode: 'lines+markers',
                name: 'OTP',
                line: { color: AF_COLORS.navy, width: 3, shape: 'spline' },
                marker: { size: 5 },
                fill: 'tozeroy',
                fillcolor: 'rgba(0, 33, 87, 0.08)',
            },
            {
                x: months,
                y: Array(months.length).fill(80),
                type: 'scatter', mode: 'lines',
                name: 'Objectif 80%',
                line: { color: AF_COLORS.red, width: 2, dash: 'dash' },
            },
        ];

        const layout = {
            ...getTheme(),
            yaxis: { ...getTheme().yaxis, title: 'OTP %', range: [50, 100] },
            legend: { orientation: 'h', y: 1.1 },
        };

        Plotly.newPlot('chart-otp', traces, layout, plotConfig);
    },

    renderCauses(flights) {
        const delayed = flights.filter(f => f.cause_retard && f.cause_retard !== 'Aucun');
        const grouped = DataStore.groupBy(delayed, f => f.cause_retard);
        const data = Object.entries(grouped)
            .map(([cause, items]) => ({ cause, count: items.length }))
            .sort((a, b) => b.count - a.count);

        const trace = {
            labels: data.map(d => d.cause),
            values: data.map(d => d.count),
            type: 'pie',
            hole: 0.55,
            marker: { colors: AF_COLORS.palette },
            textinfo: 'percent+label',
            textfont: { size: 11 },
        };

        Plotly.newPlot('chart-causes', [trace], { ...getTheme(), showlegend: false }, plotConfig);
    },

    renderDelayDist(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const delays = nonCancelled.map(f => Math.min(f.retard_depart_min, 180));

        const trace = {
            x: delays,
            type: 'histogram',
            nbinsx: 50,
            marker: { color: AF_COLORS.navy, opacity: 0.7 },
        };

        const layout = {
            ...getTheme(),
            xaxis: { ...getTheme().xaxis, title: 'Retard (min)', range: [0, 180] },
            shapes: [{
                type: 'line', x0: 15, x1: 15, y0: 0, y1: 1, yref: 'paper',
                line: { color: AF_COLORS.red, width: 2, dash: 'dash' },
            }],
        };

        Plotly.newPlot('chart-delay-dist', [trace], layout, plotConfig);
    },

    renderOTPAircraft(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const grouped = DataStore.groupBy(nonCancelled, f => f.type_avion);

        const data = Object.entries(grouped)
            .map(([type, items]) => ({
                type,
                otp: items.filter(f => f.retard_depart_min <= 15).length / items.length * 100,
            }))
            .sort((a, b) => b.otp - a.otp);

        const trace = {
            x: data.map(d => d.type),
            y: data.map(d => d.otp),
            type: 'bar',
            marker: {
                color: data.map(d => d.otp >= 80 ? AF_COLORS.green : d.otp >= 70 ? AF_COLORS.gold : AF_COLORS.red),
            },
            text: data.map(d => d.otp.toFixed(1) + '%'),
            textposition: 'outside',
        };

        const layout = {
            ...getTheme(),
            xaxis: { ...getTheme().xaxis, tickangle: -30 },
            yaxis: { ...getTheme().yaxis, range: [50, 100] },
        };

        Plotly.newPlot('chart-otp-aircraft', [trace], layout, plotConfig);
    },

    renderDelayHeat(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const hours = Array.from({ length: 18 }, (_, i) => i + 5);

        const grid = Array(7).fill(null).map(() => Array(18).fill(null).map(() => ({ sum: 0, count: 0 })));

        nonCancelled.forEach(f => {
            const h = f._hour - 5;
            if (h >= 0 && h < 18 && f._dayOfWeek >= 0 && f._dayOfWeek < 7) {
                grid[f._dayOfWeek][h].sum += f.retard_depart_min;
                grid[f._dayOfWeek][h].count++;
            }
        });

        const z = grid.map(row => row.map(cell => cell.count > 0 ? cell.sum / cell.count : 0));

        const trace = {
            z, x: hours.map(h => `${h}h`), y: days,
            type: 'heatmap',
            colorscale: [
                [0, 'rgba(16, 185, 129, 0.2)'],
                [0.5, 'rgba(196, 162, 101, 0.5)'],
                [1, 'rgba(228, 0, 43, 0.9)'],
            ],
            hovertemplate: '%{y} %{x}: %{z:.1f} min<extra></extra>',
            colorbar: { title: 'Min', thickness: 12 },
        };

        Plotly.newPlot('chart-delay-heat', [trace], { ...getTheme(), height: 280 }, plotConfig);
    },

    // ════════════════════════════════════════════════════════════════════
    // REVENUE (suite dans la même logique)
    // ════════════════════════════════════════════════════════════════════

    renderRevenueKPIs(flights) {
        const totalRev = DataStore.sum(flights, 'revenu_vol_eur');
        const totalRPK = DataStore.sum(flights, 'rpk');
        const totalASK = DataStore.sum(flights, 'ask');
        const yield_ = totalRPK > 0 ? (totalRev / totalRPK * 100) : 0;
        const rask = totalASK > 0 ? (totalRev / totalASK * 100) : 0;
        const avgPerPax = DataStore.avg(flights, 'revenu_par_pax_eur');

        document.getElementById('rev-total').textContent = formatNum(totalRev) + '€';
        document.getElementById('rev-yield').textContent = yield_.toFixed(2) + ' c€';
        document.getElementById('rev-rask').textContent = rask.toFixed(2) + ' c€';
        document.getElementById('rev-pax').textContent = '€' + avgPerPax.toFixed(0);
    },

    renderRevMonthly(flights) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();
        const rev = months.map(m => DataStore.sum(grouped[m], 'revenu_vol_eur'));

        const traces = [
            {
                x: months, y: rev,
                type: 'bar',
                name: 'CA Mensuel',
                marker: { color: AF_COLORS.navy, opacity: 0.7 },
            },
        ];

        Plotly.newPlot('chart-rev-monthly', traces, { ...getTheme(), hovermode: 'x unified' }, plotConfig);
    },

    renderRevType(flights) {
        const grouped = DataStore.groupBy(flights, f => f.courrier);
        const data = Object.entries(grouped).map(([c, items]) => ({
            courrier: c, revenue: DataStore.sum(items, 'revenu_vol_eur'),
        }));

        const trace = {
            labels: data.map(d => d.courrier),
            values: data.map(d => d.revenue),
            type: 'pie', hole: 0.6,
            marker: { colors: [AF_COLORS.navy, AF_COLORS.red, AF_COLORS.gold] },
            textinfo: 'percent+label',
        };

        Plotly.newPlot('chart-rev-type', [trace], { ...getTheme(), showlegend: false }, plotConfig);
    },

    renderYield(flights) {
        const grouped = DataStore.groupBy(flights, f => f.continent_destination || 'Autre');
        const data = Object.entries(grouped)
            .map(([c, items]) => {
                const rev = DataStore.sum(items, 'revenu_vol_eur');
                const rpk = DataStore.sum(items, 'rpk');
                return { continent: c, yield: rpk > 0 ? rev / rpk * 100 : 0 };
            })
            .sort((a, b) => b.yield - a.yield);

        const trace = {
            x: data.map(d => d.continent),
            y: data.map(d => d.yield),
            type: 'bar',
            marker: { color: AF_COLORS.palette },
            text: data.map(d => d.yield.toFixed(2)),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-yield', [trace], getTheme(), plotConfig);
    },

    renderRevScatter(flights) {
        const sample = flights.filter(() => Math.random() < 0.05);

        const trace = {
            x: sample.map(f => f.distance_km),
            y: sample.map(f => f.revenu_vol_eur),
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 4,
                color: sample.map(f => f.taux_remplissage),
                colorscale: [[0, AF_COLORS.red], [1, AF_COLORS.navy]],
                opacity: 0.5,
                colorbar: { title: 'Load', thickness: 10 },
            },
        };

        const layout = {
            ...getTheme(),
            xaxis: { ...getTheme().xaxis, title: 'Distance (km)' },
            yaxis: { ...getTheme().yaxis, title: 'Revenu (€)' },
        };

        Plotly.newPlot('chart-rev-scatter', [trace], layout, plotConfig);
    },

    renderTopRoutes(flights) {
        const routeAgg = {};
        flights.forEach(f => {
            const key = `${f.aeroport_depart} → ${f.aeroport_arrivee}`;
            if (!routeAgg[key]) routeAgg[key] = { route: key, rev: 0 };
            routeAgg[key].rev += f.revenu_vol_eur;
        });

        const sorted = Object.values(routeAgg).sort((a, b) => b.rev - a.rev).slice(0, 15).reverse();

        const trace = {
            y: sorted.map(d => d.route),
            x: sorted.map(d => d.rev),
            type: 'bar', orientation: 'h',
            marker: {
                color: sorted.map((_, i) => `rgba(0, 33, 87, ${0.25 + (i / 15) * 0.75})`),
            },
            text: sorted.map(d => formatNum(d.rev) + '€'),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-top-routes', [trace], { ...getTheme(), height: 420 }, plotConfig);
    },

    // ════════════════════════════════════════════════════════════════════
    // SATISFACTION
    // ════════════════════════════════════════════════════════════════════

    renderSatKPIs(satisfaction) {
        const avgGlobal = DataStore.avg(satisfaction, 'note_globale');
        const promoters = satisfaction.filter(s => s.nps_categorie === 'Promoteur').length;
        const detractors = satisfaction.filter(s => s.nps_categorie === 'Détracteur').length;
        const nps = Math.round((promoters - detractors) / satisfaction.length * 100);
        const recommend = satisfaction.filter(s => s.recommandation === 'Oui').length / satisfaction.length * 100;

        document.getElementById('sat-note').textContent = avgGlobal.toFixed(1) + '/10';
        document.getElementById('sat-nps').textContent = (nps >= 0 ? '+' : '') + nps;
        document.getElementById('sat-reco').textContent = recommend.toFixed(0) + '%';
        document.getElementById('sat-total').textContent = formatNum(satisfaction.length);
    },

    renderRadar(satisfaction) {
        const categories = ['Confort', 'Repas', 'Divertissement', 'Équipage', 'Ponctualité', 'Enregistrement'];
        const fields = ['note_confort', 'note_repas', 'note_divertissement', 'note_equipage', 'note_ponctualite', 'note_enregistrement'];
        const values = fields.map(f => DataStore.avg(satisfaction, f));
        values.push(values[0]);

        const trace = {
            type: 'scatterpolar',
            r: values,
            theta: [...categories, categories[0]],
            fill: 'toself',
            fillcolor: 'rgba(0, 33, 87, 0.15)',
            line: { color: AF_COLORS.navy, width: 2.5 },
            marker: { size: 6, color: AF_COLORS.navy },
        };

        const layout = {
            ...getTheme(),
            polar: {
                radialaxis: { visible: true, range: [0, 10] },
                bgcolor: 'rgba(0,0,0,0)',
            },
            showlegend: false,
        };

        Plotly.newPlot('chart-radar', [trace], layout, plotConfig);
    },

    renderNPS(satisfaction) {
        const cats = ['Promoteur', 'Passif', 'Détracteur'];
        const counts = cats.map(c => satisfaction.filter(s => s.nps_categorie === c).length);
        const colors = [AF_COLORS.green, AF_COLORS.gold, AF_COLORS.red];

        const trace = {
            x: cats, y: counts,
            type: 'bar',
            marker: { color: colors },
            text: counts.map(c => ((c / satisfaction.length) * 100).toFixed(1) + '%'),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-nps', [trace], getTheme(), plotConfig);
    },

    renderSatClass(satisfaction) {
        const classes = ['Business', 'Premium Éco', 'Économique'];
        const colors = [AF_COLORS.navy, AF_COLORS.gold, AF_COLORS.sky];

        const data = classes.map((cls, i) => {
            const items = satisfaction.filter(s => s.classe === cls);
            return {
                x: ['Note'],
                y: [DataStore.avg(items, 'note_globale')],
                name: cls,
                type: 'bar',
                marker: { color: colors[i] },
            };
        });

        Plotly.newPlot('chart-sat-class', data, { ...getTheme(), barmode: 'group' }, plotConfig);
    },

    renderSatFidelity(satisfaction) {
        const programs = ['Non inscrit', 'Explorer', 'Silver', 'Gold', 'Platinum'];
        const data = programs.map(p => {
            const items = satisfaction.filter(s => s.programme_fidelite === p);
            return { program: p, note: DataStore.avg(items, 'note_globale') };
        }).filter(d => d.note > 0);

        const trace = {
            x: data.map(d => d.program),
            y: data.map(d => d.note),
            type: 'bar',
            marker: { color: AF_COLORS.palette },
            text: data.map(d => d.note.toFixed(1)),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-sat-fidelity', [trace], { ...getTheme(), yaxis: { ...getTheme().yaxis, range: [0, 10] } }, plotConfig);
    },

    renderSatTrend(satisfaction) {
        const grouped = DataStore.groupBy(satisfaction, s => s._yearMonth);
        const months = Object.keys(grouped).sort();
        const avg = months.map(m => DataStore.avg(grouped[m], 'note_globale'));

        const trace = {
            x: months, y: avg,
            type: 'scatter', mode: 'lines+markers',
            line: { color: AF_COLORS.navy, width: 3, shape: 'spline' },
            marker: { size: 5 },
            fill: 'tozeroy',
            fillcolor: 'rgba(0, 33, 87, 0.08)',
        };

        Plotly.newPlot('chart-sat-trend', [trace], { ...getTheme(), yaxis: { ...getTheme().yaxis, range: [5, 10] } }, plotConfig);
    },

    renderSatTraveler(satisfaction) {
        const types = ['Affaires', 'Loisirs', 'Famille', 'Solo'];
        const data = types.map(t => {
            const items = satisfaction.filter(s => s.type_voyageur === t);
            return { type: t, count: items.length };
        }).filter(d => d.count > 0);

        const trace = {
            labels: data.map(d => d.type),
            values: data.map(d => d.count),
            type: 'pie', hole: 0.5,
            marker: { colors: AF_COLORS.palette },
            textinfo: 'percent+label',
        };

        Plotly.newPlot('chart-sat-traveler', [trace], { ...getTheme(), showlegend: false }, plotConfig);
    },

    // ════════════════════════════════════════════════════════════════════
    // ENVIRONMENT
    // ════════════════════════════════════════════════════════════════════

    renderEnvKPIs(flights) {
        const totalCO2 = DataStore.sum(flights, 'co2_tonnes');
        const totalRPK = DataStore.sum(flights, 'rpk');
        const co2PerPaxKm = totalRPK > 0 ? (totalCO2 * 1e6 / totalRPK) : 0;
        const totalFuel = DataStore.sum(flights, 'carburant_litres');
        const fuelPer100 = totalRPK > 0 ? (totalFuel / totalRPK * 100) : 0;

        document.getElementById('env-co2').textContent = (totalCO2 / 1000).toFixed(1);
        document.getElementById('env-co2pax').textContent = co2PerPaxKm.toFixed(1);
        document.getElementById('env-fuel').textContent = (totalFuel / 1e6).toFixed(1);
        document.getElementById('env-eff').textContent = fuelPer100.toFixed(2);
    },

    renderEnvCO2(flights) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();
        const co2 = months.map(m => DataStore.sum(grouped[m], 'co2_tonnes'));

        const trace = {
            x: months, y: co2,
            type: 'bar',
            marker: {
                color: co2.map(v => {
                    const max = Math.max(...co2);
                    const t = v / max;
                    return t > 0.8 ? AF_COLORS.red : t > 0.5 ? AF_COLORS.gold : AF_COLORS.green;
                }),
            },
        };

        Plotly.newPlot('chart-env-co2', [trace], getTheme(), plotConfig);
    },

    renderEnvAircraft(flights) {
        const grouped = DataStore.groupBy(flights, f => f.type_avion);
        const data = Object.entries(grouped).map(([type, items]) => {
            const rpk = DataStore.sum(items, 'rpk');
            const co2 = DataStore.sum(items, 'co2_tonnes');
            return { type, efficiency: rpk > 0 ? co2 * 1e6 / rpk : 0 };
        }).sort((a, b) => a.efficiency - b.efficiency);

        const trace = {
            x: data.map(d => d.type),
            y: data.map(d => d.efficiency),
            type: 'bar',
            marker: {
                color: data.map(d => d.efficiency < 80 ? AF_COLORS.green : d.efficiency < 100 ? AF_COLORS.gold : AF_COLORS.red),
            },
            text: data.map(d => d.efficiency.toFixed(1)),
            textposition: 'outside',
        };

        Plotly.newPlot('chart-env-aircraft', [trace], { ...getTheme(), xaxis: { ...getTheme().xaxis, tickangle: -30 } }, plotConfig);
    },

    renderEnvFuel(flights) {
        const grouped = DataStore.groupBy(flights, f => f.courrier);
        const data = Object.entries(grouped).map(([c, items]) => ({
            courrier: c, fuel: DataStore.sum(items, 'carburant_litres'),
        }));

        const trace = {
            labels: data.map(d => d.courrier),
            values: data.map(d => d.fuel),
            type: 'pie', hole: 0.55,
            marker: { colors: [AF_COLORS.sky, AF_COLORS.gold, AF_COLORS.navy] },
            textinfo: 'percent+label',
        };

        Plotly.newPlot('chart-env-fuel', [trace], { ...getTheme(), showlegend: false }, plotConfig);
    },

    renderEnvScatter(flights) {
        const sample = flights.filter(() => Math.random() < 0.03);

        const trace = {
            x: sample.map(f => f.distance_km),
            y: sample.map(f => f.rpk > 0 ? f.co2_tonnes * 1e6 / f.rpk : 0),
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 5,
                color: sample.map(f => f.taux_remplissage),
                colorscale: [[0, AF_COLORS.red], [1, AF_COLORS.green]],
                opacity: 0.5,
                colorbar: { title: 'Load', thickness: 10 },
            },
        };

        const layout = {
            ...getTheme(),
            xaxis: { ...getTheme().xaxis, title: 'Distance (km)' },
            yaxis: { ...getTheme().yaxis, title: 'g CO₂/pax·km' },
        };

        Plotly.newPlot('chart-env-scatter', [trace], layout, plotConfig);
    },
};
