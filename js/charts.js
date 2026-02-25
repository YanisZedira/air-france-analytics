/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Charts Engine (Plotly)
 * ============================================================================
 */

const AF_COLORS = {
    navy: '#002157',
    navyLight: '#003380',
    red: '#E4002B',
    gold: '#C4A265',
    sky: '#6BAADB',
    skyLight: '#8EC4E8',
    white: '#f0f2f8',
    gradient: ['#002157', '#003380', '#1a5fb4', '#6BAADB', '#8EC4E8', '#C4A265', '#E4002B'],
    sequential: ['#001533', '#002157', '#003380', '#0052a5', '#1a6fd0', '#3d8bdb', '#6BAADB', '#8EC4E8', '#b8dcf0'],
    categorical: ['#002157', '#E4002B', '#C4A265', '#6BAADB', '#34d399', '#a78bfa', '#f97316', '#8EC4E8', '#ec4899', '#14b8a6'],
    diverging: ['#E4002B', '#f87171', '#fca5a5', '#f0f2f8', '#8EC4E8', '#6BAADB', '#002157'],
};

function getPlotlyTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: 'Inter, sans-serif',
            color: isDark ? '#8892a8' : '#4a5568',
            size: 12,
        },
        xaxis: {
            gridcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
            linecolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            zerolinecolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
        },
        yaxis: {
            gridcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
            linecolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            zerolinecolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
        },
        margin: { l: 50, r: 20, t: 30, b: 40 },
        hoverlabel: {
            bgcolor: isDark ? '#1a1f35' : '#ffffff',
            bordercolor: isDark ? '#333' : '#ddd',
            font: { family: 'Inter', size: 13, color: isDark ? '#f0f2f8' : '#0a0e1a' },
        },
    };
}

const plotlyConfig = { displayModeBar: false, responsive: true };

function formatNumber(n, decimals = 0) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' Md';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' k';
    return n.toFixed(decimals);
}

const Charts = {

    // ================================================================
    // OVERVIEW PAGE
    // ================================================================

    renderOverviewKPIs(flights) {
        const totalFlights = flights.length;
        const totalPax = DataStore.sum(flights, 'passagers');
        const totalRevenue = DataStore.sum(flights, 'revenu_vol_eur');
        const otpFlights = flights.filter(f => f.retard_depart_min <= 15 && f.statut_vol !== 'Annulé');
        const otp = (otpFlights.length / flights.filter(f => f.statut_vol !== 'Annulé').length * 100);
        const avgLoad = DataStore.avg(flights, 'taux_remplissage') * 100;
        const totalRPK = DataStore.sum(flights, 'rpk');
        const totalCO2 = DataStore.sum(flights, 'co2_tonnes');
        const co2PerPaxKm = totalRPK > 0 ? (totalCO2 * 1e6 / totalRPK) : 0; // g/pax.km

        document.querySelector('#kpi-vols .kpi-value').textContent = formatNumber(totalFlights);
        document.querySelector('#kpi-pax .kpi-value').textContent = formatNumber(totalPax);
        document.querySelector('#kpi-revenue .kpi-value').textContent = formatNumber(totalRevenue) + '€';
        document.querySelector('#kpi-otp .kpi-value').textContent = otp.toFixed(1) + '%';
        document.querySelector('#kpi-load .kpi-value').textContent = avgLoad.toFixed(1) + '%';
        document.querySelector('#kpi-co2 .kpi-value').textContent = co2PerPaxKm.toFixed(1) + 'g';

        // Sparklines
        this.renderSparkline('spark-vols', flights, f => 1, 'count');
        this.renderSparkline('spark-pax', flights, f => f.passagers, 'sum');
        this.renderSparkline('spark-rev', flights, f => f.revenu_vol_eur, 'sum');
    },

    renderSparkline(containerId, flights, valueFn, mode) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();
        const values = months.map(m => {
            const items = grouped[m];
            if (mode === 'count') return items.length;
            return items.reduce((s, x) => s + valueFn(x), 0);
        });

        const trace = {
            x: months,
            y: values,
            type: 'scatter',
            mode: 'lines',
            line: { color: AF_COLORS.sky, width: 2, shape: 'spline' },
            fill: 'tozeroy',
            fillcolor: 'rgba(107, 170, 219, 0.1)',
        };

        const layout = {
            ...getPlotlyTheme(),
            margin: { l: 0, r: 0, t: 0, b: 0 },
            xaxis: { visible: false },
            yaxis: { visible: false },
            showlegend: false,
            height: 30,
        };

        Plotly.newPlot(containerId, [trace], layout, plotlyConfig);
    },

    renderMonthlyTrend(flights) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();

        const volsData = months.map(m => grouped[m].length);
        const paxData = months.map(m => grouped[m].reduce((s, f) => s + f.passagers, 0));
        const revData = months.map(m => grouped[m].reduce((s, f) => s + f.revenu_vol_eur, 0));

        const traces = [
            {
                x: months, y: volsData, type: 'scatter', mode: 'lines+markers',
                name: 'Vols', line: { color: AF_COLORS.navy, width: 3, shape: 'spline' },
                marker: { size: 4, color: AF_COLORS.navy },
                fill: 'tozeroy', fillcolor: 'rgba(0, 33, 87, 0.08)',
            },
            {
                x: months, y: paxData, type: 'scatter', mode: 'lines+markers',
                name: 'Passagers', line: { color: AF_COLORS.sky, width: 3, shape: 'spline' },
                marker: { size: 4, color: AF_COLORS.sky },
                visible: false,
            },
            {
                x: months, y: revData, type: 'bar',
                name: 'Revenus (€)', marker: { color: AF_COLORS.gold, opacity: 0.8 },
                visible: false,
            },
        ];

        const layout = {
            ...getPlotlyTheme(),
            showlegend: false,
            hovermode: 'x unified',
        };

        Plotly.newPlot('chart-monthly-trend', traces, layout, plotlyConfig);

        // Button toggles
        document.querySelectorAll('#page-overview .chart-actions .chart-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#page-overview .chart-actions .chart-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const update = { visible: [false, false, false] };
                update.visible[i] = true;
                Plotly.restyle('chart-monthly-trend', { visible: update.visible.map((v, j) => j === i) });
            });
        });
    },

    renderCourrierDonut(flights) {
        const grouped = DataStore.groupBy(flights, f => f.courrier);
        const labels = Object.keys(grouped);
        const values = labels.map(l => grouped[l].length);

        const trace = {
            labels, values, type: 'pie', hole: 0.65,
            marker: { colors: [AF_COLORS.navy, AF_COLORS.red, AF_COLORS.gold] },
            textinfo: 'percent',
            textfont: { size: 13, family: 'Inter' },
            hoverinfo: 'label+value+percent',
            sort: false,
        };

        const layout = {
            ...getPlotlyTheme(),
            showlegend: true,
            legend: { orientation: 'h', y: -0.1, font: { size: 11 } },
            annotations: [{
                text: `<b>${formatNumber(flights.length)}</b><br>vols`,
                showarrow: false, font: { size: 16, family: 'Inter', color: getPlotlyTheme().font.color },
            }],
        };

        Plotly.newPlot('chart-courrier-donut', [trace], layout, plotlyConfig);
    },

    renderTopDestinations(flights) {
        const grouped = DataStore.groupBy(flights, f => f.aeroport_arrivee);
        const sorted = Object.entries(grouped)
            .map(([k, v]) => ({ dest: k, pax: v.reduce((s, f) => s + f.passagers, 0) }))
            .sort((a, b) => b.pax - a.pax)
            .slice(0, 10)
            .reverse();

        const trace = {
            y: sorted.map(d => d.dest),
            x: sorted.map(d => d.pax),
            type: 'bar', orientation: 'h',
            marker: {
                color: sorted.map((_, i) => {
                    const t = i / (sorted.length - 1);
                    return `rgba(0, 33, 87, ${0.3 + t * 0.7})`;
                }),
                line: { width: 0 },
            },
            text: sorted.map(d => formatNumber(d.pax)),
            textposition: 'outside',
            textfont: { size: 11 },
            hovertemplate: '%{y}: %{x:,.0f} passagers<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            xaxis: { ...getPlotlyTheme().xaxis, title: 'Passagers' },
        };

        Plotly.newPlot('chart-top-destinations', [trace], layout, plotlyConfig);
    },

    renderContinentPerf(flights) {
        const grouped = DataStore.groupBy(flights, f => f.continent_destination || 'Autre');
        const continents = Object.keys(grouped).sort();

        const data = continents.map(c => {
            const items = grouped[c];
            return {
                continent: c,
                vols: items.length,
                pax: items.reduce((s, f) => s + f.passagers, 0),
                revenue: items.reduce((s, f) => s + f.revenu_vol_eur, 0),
                avgLoad: items.reduce((s, f) => s + f.taux_remplissage, 0) / items.length * 100,
            };
        });

        const traces = [
            {
                x: data.map(d => d.continent),
                y: data.map(d => d.revenue),
                type: 'bar', name: 'Revenus (€)',
                marker: { color: AF_COLORS.navy, opacity: 0.85 },
                yaxis: 'y',
            },
            {
                x: data.map(d => d.continent),
                y: data.map(d => d.avgLoad),
                type: 'scatter', mode: 'lines+markers', name: 'Taux remplissage (%)',
                line: { color: AF_COLORS.red, width: 3 },
                marker: { size: 8, color: AF_COLORS.red },
                yaxis: 'y2',
            },
        ];

        const layout = {
            ...getPlotlyTheme(),
            barmode: 'group',
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Revenus (€)', side: 'left' },
            yaxis2: { ...getPlotlyTheme().yaxis, title: 'Taux remplissage (%)', overlaying: 'y', side: 'right', range: [60, 100] },
            legend: { orientation: 'h', y: 1.1, font: { size: 11 } },
            hovermode: 'x unified',
        };

        Plotly.newPlot('chart-continent-perf', traces, layout, plotlyConfig);
    },

    renderHeatmapFlights(flights) {
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const hours = Array.from({ length: 18 }, (_, i) => i + 5); // 5h to 22h

        const grid = Array(7).fill(null).map(() => Array(18).fill(0));
        flights.forEach(f => {
            const h = f._hour - 5;
            if (h >= 0 && h < 18) {
                grid[f._dayOfWeek][h]++;
            }
        });

        const trace = {
            z: grid, x: hours.map(h => `${h}h`), y: days,
            type: 'heatmap',
            colorscale: [
                [0, 'rgba(0, 33, 87, 0.05)'],
                [0.25, 'rgba(0, 51, 128, 0.2)'],
                [0.5, 'rgba(107, 170, 219, 0.4)'],
                [0.75, 'rgba(107, 170, 219, 0.7)'],
                [1, 'rgba(228, 0, 43, 0.9)'],
            ],
            hovertemplate: '%{y} %{x}: %{z} vols<extra></extra>',
            showscale: true,
            colorbar: { title: 'Vols', thickness: 12, len: 0.8 },
        };

        const layout = { ...getPlotlyTheme(), height: 300 };
        Plotly.newPlot('chart-heatmap-flights', [trace], layout, plotlyConfig);
    },

    renderLoadFactorTrend(flights) {
        const courriers = ['Court-courrier', 'Moyen-courrier', 'Long-courrier'];
        const colors = [AF_COLORS.navy, AF_COLORS.red, AF_COLORS.gold];

        const traces = courriers.map((c, ci) => {
            const cFlights = flights.filter(f => f.courrier === c);
            const grouped = DataStore.groupBy(cFlights, f => f._yearMonth);
            const months = Object.keys(grouped).sort();
            return {
                x: months,
                y: months.map(m => DataStore.avg(grouped[m], 'taux_remplissage') * 100),
                type: 'scatter', mode: 'lines',
                name: c,
                line: { color: colors[ci], width: 2.5, shape: 'spline' },
            };
        });

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Taux remplissage (%)', range: [65, 100] },
            legend: { orientation: 'h', y: 1.1, font: { size: 11 } },
            hovermode: 'x unified',
        };

        Plotly.newPlot('chart-load-factor', traces, layout, plotlyConfig);
    },

    // ================================================================
    // NETWORK PAGE
    // ================================================================

    renderNetworkKPIs(flights, airports) {
        const destinations = new Set(flights.map(f => f.aeroport_arrivee));
        const routes = new Set(flights.map(f => `${f.aeroport_depart}-${f.aeroport_arrivee}`));
        const countries = new Set(airports.filter(a => destinations.has(a.code_iata)).map(a => a.pays));
        const avgDist = DataStore.avg(flights, 'distance_km');

        document.getElementById('net-destinations').textContent = destinations.size;
        document.getElementById('net-routes').textContent = routes.size;
        document.getElementById('net-countries').textContent = countries.size;
        document.getElementById('net-avg-dist').textContent = formatNumber(avgDist);
    },

    renderWorldMap(flights, airports) {
        const airportMap = {};
        airports.forEach(a => { airportMap[a.code_iata] = a; });

        // Aggregate routes
        const routeAgg = {};
        flights.forEach(f => {
            const key = `${f.aeroport_depart}-${f.aeroport_arrivee}`;
            if (!routeAgg[key]) {
                routeAgg[key] = { dep: f.aeroport_depart, arr: f.aeroport_arrivee, count: 0, pax: 0 };
            }
            routeAgg[key].count++;
            routeAgg[key].pax += f.passagers;
        });

        const routes = Object.values(routeAgg);

        // Airport traffic
        const airportTraffic = {};
        flights.forEach(f => {
            airportTraffic[f.aeroport_depart] = (airportTraffic[f.aeroport_depart] || 0) + 1;
            airportTraffic[f.aeroport_arrivee] = (airportTraffic[f.aeroport_arrivee] || 0) + 1;
        });

        // Routes as lines
        const routeTraces = [];
        const maxCount = Math.max(...routes.map(r => r.count));

        routes.forEach(r => {
            const a1 = airportMap[r.dep];
            const a2 = airportMap[r.arr];
            if (!a1 || !a2) return;

            const intensity = r.count / maxCount;
            const width = 0.8 + intensity * 3;

            routeTraces.push({
                type: 'scattergeo',
                lon: [a1.longitude, a2.longitude],
                lat: [a1.latitude, a2.latitude],
                mode: 'lines',
                line: {
                    width: width,
                    color: `rgba(0, 33, 87, ${0.15 + intensity * 0.5})`,
                },
                hoverinfo: 'text',
                text: `${r.dep} → ${r.arr}<br>${r.count} vols | ${formatNumber(r.pax)} pax`,
                showlegend: false,
            });
        });

        // Airport points
        const usedAirports = airports.filter(a => airportTraffic[a.code_iata]);
        const maxTraffic = Math.max(...usedAirports.map(a => airportTraffic[a.code_iata] || 0));

        const continentColors = {
            'Europe': AF_COLORS.navy,
            'Amérique du Nord': AF_COLORS.red,
            'Amérique du Sud': AF_COLORS.gold,
            'Afrique': '#34d399',
            'Asie': AF_COLORS.sky,
            'Moyen-Orient': '#a78bfa',
            'Océan Indien': '#14b8a6',
            'Caraïbes': '#f97316',
        };

        const airportTrace = {
            type: 'scattergeo',
            lon: usedAirports.map(a => a.longitude),
            lat: usedAirports.map(a => a.latitude),
            mode: 'markers+text',
            marker: {
                size: usedAirports.map(a => {
                    const t = (airportTraffic[a.code_iata] || 0) / maxTraffic;
                    return 5 + t * 18;
                }),
                color: usedAirports.map(a => continentColors[a.continent] || AF_COLORS.navy),
                opacity: 0.85,
                line: { width: 1, color: 'rgba(255,255,255,0.5)' },
            },
            text: usedAirports.map(a => a.code_iata),
            textposition: 'top center',
            textfont: { size: 9, color: getPlotlyTheme().font.color, family: 'Inter' },
            hovertext: usedAirports.map(a =>
                `<b>${a.code_iata}</b> — ${a.nom}<br>${a.ville}, ${a.pays}<br>${formatNumber(airportTraffic[a.code_iata] || 0)} mouvements`
            ),
            hoverinfo: 'text',
            showlegend: false,
        };

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        const layout = {
            ...getPlotlyTheme(),
            geo: {
                projection: { type: 'natural earth' },
                showland: true,
                landcolor: isDark ? '#1a1f35' : '#f0f2f8',
                showocean: true,
                oceancolor: isDark ? '#0d1224' : '#e8f0fe',
                showcountries: true,
                countrycolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                showcoastlines: true,
                coastlinecolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
                showframe: false,
                bgcolor: 'rgba(0,0,0,0)',
                lonaxis: { range: [-130, 160] },
                lataxis: { range: [-50, 70] },
            },
            margin: { l: 0, r: 0, t: 10, b: 0 },
            height: 500,
        };

        Plotly.newPlot('chart-world-map', [...routeTraces, airportTrace], layout, plotlyConfig);
    },

    renderTrafficContinent(flights) {
        const grouped = DataStore.groupBy(flights, f => f.continent_destination || 'Autre');
        const data = Object.entries(grouped)
            .map(([c, items]) => ({ continent: c, pax: items.reduce((s, f) => s + f.passagers, 0) }))
            .sort((a, b) => b.pax - a.pax);

        const trace = {
            labels: data.map(d => d.continent),
            values: data.map(d => d.pax),
            type: 'pie', hole: 0.5,
            marker: { colors: AF_COLORS.categorical },
            textinfo: 'percent+label',
            textfont: { size: 11 },
        };

        const layout = { ...getPlotlyTheme(), showlegend: false };
        Plotly.newPlot('chart-traffic-continent', [trace], layout, plotlyConfig);
    },

    renderDistanceDistribution(flights) {
        const trace = {
            x: flights.map(f => f.distance_km),
            type: 'histogram',
            nbinsx: 40,
            marker: {
                color: AF_COLORS.navy,
                opacity: 0.75,
                line: { width: 0.5, color: 'rgba(255,255,255,0.2)' },
            },
            hovertemplate: '%{x:.0f} km: %{y} vols<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            xaxis: { ...getPlotlyTheme().xaxis, title: 'Distance (km)' },
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Nombre de vols' },
        };

        Plotly.newPlot('chart-distance-dist', [trace], layout, plotlyConfig);
    },

    // ================================================================
    // FLEET PAGE
    // ================================================================

    renderFleetKPIs(fleet) {
        document.getElementById('fleet-total').textContent = fleet.length;
        document.getElementById('fleet-types').textContent = new Set(fleet.map(a => a.type_avion)).size;
        document.getElementById('fleet-avg-age').textContent = DataStore.avg(fleet, 'age_avion_ans').toFixed(1);
        document.getElementById('fleet-seats').textContent = formatNumber(DataStore.sum(fleet, 'nb_sieges_total'));
    },

    renderFleetComposition(fleet) {
        const grouped = DataStore.groupBy(fleet, a => a.type_avion);
        const data = Object.entries(grouped)
            .map(([type, items]) => ({ type, count: items.length }))
            .sort((a, b) => b.count - a.count);

        const trace = {
            y: data.map(d => d.type),
            x: data.map(d => d.count),
            type: 'bar', orientation: 'h',
            marker: {
                color: data.map((_, i) => AF_COLORS.categorical[i % AF_COLORS.categorical.length]),
            },
            text: data.map(d => d.count),
            textposition: 'outside',
            hovertemplate: '%{y}: %{x} appareils<extra></extra>',
        };

        const layout = { ...getPlotlyTheme() };
        Plotly.newPlot('chart-fleet-comp', [trace], layout, plotlyConfig);
    },

    renderFleetAge(fleet) {
        const bins = ['0-5 ans', '5-10 ans', '10-15 ans', '15-20 ans', '20+ ans'];
        const counts = [0, 0, 0, 0, 0];
        fleet.forEach(a => {
            if (a.age_avion_ans < 5) counts[0]++;
            else if (a.age_avion_ans < 10) counts[1]++;
            else if (a.age_avion_ans < 15) counts[2]++;
            else if (a.age_avion_ans < 20) counts[3]++;
            else counts[4]++;
        });

        const trace = {
            x: bins, y: counts, type: 'bar',
            marker: {
                color: [AF_COLORS.sky, AF_COLORS.navyLight, AF_COLORS.navy, AF_COLORS.gold, AF_COLORS.red],
                opacity: 0.85,
            },
            text: counts,
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Nombre d\'avions' },
        };

        Plotly.newPlot('chart-fleet-age', [trace], layout, plotlyConfig);
    },

    renderFleetUtilization(flights) {
        const grouped = DataStore.groupBy(flights, f => f.type_avion);
        const monthCount = new Set(flights.map(f => f._yearMonth)).size || 1;

        const data = Object.entries(grouped)
            .map(([type, items]) => ({ type, volsPerMonth: Math.round(items.length / monthCount) }))
            .sort((a, b) => b.volsPerMonth - a.volsPerMonth);

        const trace = {
            x: data.map(d => d.type),
            y: data.map(d => d.volsPerMonth),
            type: 'bar',
            marker: { color: AF_COLORS.navy, opacity: 0.85 },
            text: data.map(d => d.volsPerMonth),
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Vols / mois' },
            xaxis: { ...getPlotlyTheme().xaxis, tickangle: -30 },
        };

        Plotly.newPlot('chart-fleet-utilization', [trace], layout, plotlyConfig);
    },

    renderFleetFamily(fleet) {
        const grouped = DataStore.groupBy(fleet, a => a.famille);
        const trace = {
            labels: Object.keys(grouped),
            values: Object.values(grouped).map(v => v.length),
            type: 'pie', hole: 0.6,
            marker: { colors: [AF_COLORS.navy, AF_COLORS.gold] },
            textinfo: 'percent+label',
        };

        const layout = { ...getPlotlyTheme(), showlegend: false };
        Plotly.newPlot('chart-fleet-family', [trace], layout, plotlyConfig);
    },

    // ================================================================
    // OPERATIONS PAGE
    // ================================================================

    renderOpsKPIs(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const otp = nonCancelled.filter(f => f.retard_depart_min <= 15).length / nonCancelled.length * 100;
        const avgDelay = DataStore.avg(nonCancelled, 'retard_depart_min');
        const cancelRate = flights.filter(f => f.statut_vol === 'Annulé').length / flights.length * 100;
        const completionRate = 100 - cancelRate;

        document.getElementById('ops-otp15').textContent = otp.toFixed(1) + '%';
        document.getElementById('ops-avg-delay').textContent = avgDelay.toFixed(0) + ' min';
        document.getElementById('ops-cancel').textContent = cancelRate.toFixed(2) + '%';
        document.getElementById('ops-completion').textContent = completionRate.toFixed(1) + '%';
    },

    renderOTPMonthly(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const grouped = DataStore.groupBy(nonCancelled, f => f._yearMonth);
        const months = Object.keys(grouped).sort();

        const otp = months.map(m => {
            const items = grouped[m];
            return items.filter(f => f.retard_depart_min <= 15).length / items.length * 100;
        });

        const trace = {
            x: months, y: otp, type: 'scatter', mode: 'lines+markers',
            line: { color: AF_COLORS.navy, width: 3, shape: 'spline' },
            marker: { size: 5, color: AF_COLORS.navy },
            fill: 'tozeroy', fillcolor: 'rgba(0, 33, 87, 0.06)',
            hovertemplate: '%{x}: %{y:.1f}%<extra></extra>',
        };

        // Target line at 80%
        const targetLine = {
            x: months, y: Array(months.length).fill(80),
            type: 'scatter', mode: 'lines', name: 'Objectif 80%',
            line: { color: AF_COLORS.red, width: 2, dash: 'dash' },
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'OTP (%)', range: [50, 100] },
            showlegend: true, legend: { orientation: 'h', y: 1.1, font: { size: 11 } },
        };

        Plotly.newPlot('chart-otp-monthly', [trace, targetLine], layout, plotlyConfig);
    },

    renderDelayCauses(flights) {
        const delayed = flights.filter(f => f.cause_retard && f.cause_retard !== 'Aucun');
        const grouped = DataStore.groupBy(delayed, f => f.cause_retard);
        const data = Object.entries(grouped)
            .map(([cause, items]) => ({ cause, count: items.length }))
            .sort((a, b) => b.count - a.count);

        const trace = {
            labels: data.map(d => d.cause),
            values: data.map(d => d.count),
            type: 'pie', hole: 0.55,
            marker: { colors: AF_COLORS.categorical },
            textinfo: 'percent+label',
            textfont: { size: 11 },
        };

        const layout = {
            ...getPlotlyTheme(),
            showlegend: false,
            annotations: [{
                text: '<b>Causes</b>', showarrow: false,
                font: { size: 14, color: getPlotlyTheme().font.color },
            }],
        };

        Plotly.newPlot('chart-delay-causes', [trace], layout, plotlyConfig);
    },

    renderDelayDistribution(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const delays = nonCancelled.map(f => Math.min(f.retard_depart_min, 180));

        const trace = {
            x: delays, type: 'histogram', nbinsx: 50,
            marker: { color: AF_COLORS.navy, opacity: 0.7 },
            hovertemplate: '%{x:.0f} min: %{y} vols<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            xaxis: { ...getPlotlyTheme().xaxis, title: 'Retard (minutes)', range: [0, 180] },
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Nombre de vols' },
            shapes: [{
                type: 'line', x0: 15, x1: 15, y0: 0, y1: 1, yref: 'paper',
                line: { color: AF_COLORS.red, width: 2, dash: 'dash' },
            }],
            annotations: [{
                x: 15, y: 1, yref: 'paper', text: 'Seuil OTP (15 min)',
                showarrow: false, font: { size: 10, color: AF_COLORS.red }, yshift: 10,
            }],
        };

        Plotly.newPlot('chart-delay-distribution', [trace], layout, plotlyConfig);
    },

    renderOTPByAircraft(flights) {
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
                color: data.map(d => d.otp >= 80 ? AF_COLORS.navy : d.otp >= 70 ? AF_COLORS.gold : AF_COLORS.red),
                opacity: 0.85,
            },
            text: data.map(d => d.otp.toFixed(1) + '%'),
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'OTP (%)', range: [50, 100] },
            xaxis: { ...getPlotlyTheme().xaxis, tickangle: -30 },
        };

        Plotly.newPlot('chart-otp-aircraft', [trace], layout, plotlyConfig);
    },

    renderDelayHeatmap(flights) {
        const nonCancelled = flights.filter(f => f.statut_vol !== 'Annulé');
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const hours = Array.from({ length: 18 }, (_, i) => i + 5);

        const grid = Array(7).fill(null).map(() => Array(18).fill(null).map(() => ({ sum: 0, count: 0 })));

        nonCancelled.forEach(f => {
            const h = f._hour - 5;
            if (h >= 0 && h < 18) {
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
                [0.3, 'rgba(196, 162, 101, 0.4)'],
                [0.6, 'rgba(228, 0, 43, 0.5)'],
                [1, 'rgba(228, 0, 43, 0.9)'],
            ],
            hovertemplate: '%{y} %{x}: %{z:.1f} min retard moy.<extra></extra>',
            colorbar: { title: 'Min', thickness: 12, len: 0.8 },
        };

        const layout = { ...getPlotlyTheme(), height: 320 };
        Plotly.newPlot('chart-delay-heatmap', [trace], layout, plotlyConfig);
    },

    // ================================================================
    // REVENUE PAGE
    // ================================================================

    renderRevenueKPIs(flights) {
        const totalRev = DataStore.sum(flights, 'revenu_vol_eur');
        const totalRPK = DataStore.sum(flights, 'rpk');
        const totalASK = DataStore.sum(flights, 'ask');
        const yield_ = totalRPK > 0 ? (totalRev / totalRPK * 100) : 0;
        const rask = totalASK > 0 ? (totalRev / totalASK * 100) : 0;
        const avgPerPax = DataStore.avg(flights, 'revenu_par_pax_eur');

        document.getElementById('rev-total').textContent = formatNumber(totalRev) + '€';
        document.getElementById('rev-yield').textContent = yield_.toFixed(2);
        document.getElementById('rev-rask').textContent = rask.toFixed(2);
        document.getElementById('rev-perpax').textContent = '€' + avgPerPax.toFixed(0);
    },

    renderRevenueMonthly(flights) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();
        const rev = months.map(m => grouped[m].reduce((s, f) => s + f.revenu_vol_eur, 0));

        // Moving average
        const ma = rev.map((_, i) => {
            const start = Math.max(0, i - 2);
            const slice = rev.slice(start, i + 1);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });

        const traces = [
            {
                x: months, y: rev, type: 'bar', name: 'CA Mensuel',
                marker: { color: AF_COLORS.navy, opacity: 0.7 },
            },
            {
                x: months, y: ma, type: 'scatter', mode: 'lines', name: 'Moyenne mobile (3 mois)',
                line: { color: AF_COLORS.red, width: 3, shape: 'spline' },
            },
        ];

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Revenus (€)' },
            legend: { orientation: 'h', y: 1.1 },
            hovermode: 'x unified',
        };

        Plotly.newPlot('chart-revenue-monthly', traces, layout, plotlyConfig);
    },

    renderRevenueCourrier(flights) {
        const grouped = DataStore.groupBy(flights, f => f.courrier);
        const data = Object.entries(grouped).map(([c, items]) => ({
            courrier: c, revenue: items.reduce((s, f) => s + f.revenu_vol_eur, 0),
        }));

        const trace = {
            labels: data.map(d => d.courrier),
            values: data.map(d => d.revenue),
            type: 'pie', hole: 0.6,
            marker: { colors: [AF_COLORS.navy, AF_COLORS.red, AF_COLORS.gold] },
            textinfo: 'percent+label',
        };

        const layout = {
            ...getPlotlyTheme(),
            showlegend: false,
            annotations: [{
                text: `<b>${formatNumber(DataStore.sum(flights, 'revenu_vol_eur'))}€</b>`,
                showarrow: false, font: { size: 14, color: getPlotlyTheme().font.color },
            }],
        };

        Plotly.newPlot('chart-revenue-courrier', [trace], layout, plotlyConfig);
    },

    renderYieldContinent(flights) {
        const grouped = DataStore.groupBy(flights, f => f.continent_destination || 'Autre');
        const data = Object.entries(grouped)
            .map(([c, items]) => {
                const rev = items.reduce((s, f) => s + f.revenu_vol_eur, 0);
                const rpk = items.reduce((s, f) => s + f.rpk, 0);
                return { continent: c, yield: rpk > 0 ? rev / rpk * 100 : 0 };
            })
            .sort((a, b) => b.yield - a.yield);

        const trace = {
            x: data.map(d => d.continent),
            y: data.map(d => d.yield),
            type: 'bar',
            marker: { color: AF_COLORS.categorical },
            text: data.map(d => d.yield.toFixed(2)),
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Yield (c€/RPK)' },
        };

        Plotly.newPlot('chart-yield-continent', [trace], layout, plotlyConfig);
    },

    renderRevenueScatter(flights) {
        // Sample for performance
        const sample = flights.filter(() => Math.random() < 0.05);

        const trace = {
            x: sample.map(f => f.distance_km),
            y: sample.map(f => f.revenu_vol_eur),
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 4,
                color: sample.map(f => f.taux_remplissage),
                colorscale: [[0, AF_COLORS.red], [0.5, AF_COLORS.gold], [1, AF_COLORS.navy]],
                opacity: 0.5,
                colorbar: { title: 'Load', thickness: 10, len: 0.6 },
            },
            hovertemplate: 'Distance: %{x:.0f} km<br>Revenu: %{y:,.0f}€<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            xaxis: { ...getPlotlyTheme().xaxis, title: 'Distance (km)' },
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Revenu par vol (€)' },
        };

        Plotly.newPlot('chart-revenue-scatter', [trace], layout, plotlyConfig);
    },

    renderTopRoutesRevenue(flights) {
        const routeAgg = {};
        flights.forEach(f => {
            const key = `${f.aeroport_depart} → ${f.aeroport_arrivee}`;
            if (!routeAgg[key]) routeAgg[key] = { route: key, rev: 0, count: 0 };
            routeAgg[key].rev += f.revenu_vol_eur;
            routeAgg[key].count++;
        });

        const sorted = Object.values(routeAgg).sort((a, b) => b.rev - a.rev).slice(0, 15).reverse();

        const trace = {
            y: sorted.map(d => d.route),
            x: sorted.map(d => d.rev),
            type: 'bar', orientation: 'h',
            marker: {
                color: sorted.map((_, i) => {
                    const t = i / (sorted.length - 1);
                    return `rgba(0, 33, 87, ${0.25 + t * 0.75})`;
                }),
            },
            text: sorted.map(d => formatNumber(d.rev) + '€'),
            textposition: 'outside',
            hovertemplate: '%{y}: %{x:,.0f}€<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            xaxis: { ...getPlotlyTheme().xaxis, title: 'Revenus cumulés (€)' },
            height: 450,
        };

        Plotly.newPlot('chart-top-routes-revenue', [trace], layout, plotlyConfig);
    },

    // ================================================================
    // SATISFACTION PAGE
    // ================================================================

    renderSatisfactionKPIs(satisfaction) {
        const avgGlobal = DataStore.avg(satisfaction, 'note_globale');
        const promoters = satisfaction.filter(s => s.nps_categorie === 'Promoteur').length;
        const detractors = satisfaction.filter(s => s.nps_categorie === 'Détracteur').length;
        const nps = Math.round((promoters - detractors) / satisfaction.length * 100);
        const recommend = satisfaction.filter(s => s.recommandation === 'Oui').length / satisfaction.length * 100;

        document.getElementById('sat-global').textContent = avgGlobal.toFixed(1) + '/10';
        document.getElementById('sat-nps').textContent = (nps >= 0 ? '+' : '') + nps;
        document.getElementById('sat-recommend').textContent = recommend.toFixed(0) + '%';
        document.getElementById('sat-surveys').textContent = formatNumber(satisfaction.length);
    },

    renderSatisfactionRadar(satisfaction) {
        const categories = ['Confort', 'Repas', 'Divertissement', 'Équipage', 'Ponctualité', 'Enregistrement'];
        const fields = ['note_confort', 'note_repas', 'note_divertissement', 'note_equipage', 'note_ponctualite', 'note_enregistrement'];
        const values = fields.map(f => DataStore.avg(satisfaction, f));
        values.push(values[0]); // close the polygon

        const trace = {
            type: 'scatterpolar',
            r: [...values],
            theta: [...categories, categories[0]],
            fill: 'toself',
            fillcolor: 'rgba(0, 33, 87, 0.15)',
            line: { color: AF_COLORS.navy, width: 2.5 },
            marker: { size: 6, color: AF_COLORS.navy },
            name: 'Score moyen',
        };

        const layout = {
            ...getPlotlyTheme(),
            polar: {
                radialaxis: {
                    visible: true, range: [0, 10],
                    gridcolor: getPlotlyTheme().xaxis.gridcolor,
                    linecolor: getPlotlyTheme().xaxis.linecolor,
                },
                angularaxis: {
                    gridcolor: getPlotlyTheme().xaxis.gridcolor,
                    linecolor: getPlotlyTheme().xaxis.linecolor,
                },
                bgcolor: 'rgba(0,0,0,0)',
            },
            showlegend: false,
        };

        Plotly.newPlot('chart-sat-radar', [trace], layout, plotlyConfig);
    },

    renderNPSDistribution(satisfaction) {
        const cats = ['Promoteur', 'Passif', 'Détracteur'];
        const counts = cats.map(c => satisfaction.filter(s => s.nps_categorie === c).length);
        const colors = ['#10b981', AF_COLORS.gold, AF_COLORS.red];

        const trace = {
            x: cats, y: counts, type: 'bar',
            marker: { color: colors, opacity: 0.85 },
            text: counts.map(c => ((c / satisfaction.length) * 100).toFixed(1) + '%'),
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Nombre de réponses' },
        };

        Plotly.newPlot('chart-nps-dist', [trace], layout, plotlyConfig);
    },

    renderSatisfactionByClass(satisfaction) {
        const classes = ['Business', 'Premium Éco', 'Économique'];
        const fields = ['note_confort', 'note_repas', 'note_divertissement', 'note_equipage', 'note_ponctualite'];
        const labels = ['Confort', 'Repas', 'Divertissement', 'Équipage', 'Ponctualité'];
        const colors = [AF_COLORS.navy, AF_COLORS.gold, AF_COLORS.sky];

        const traces = classes.map((cls, ci) => {
            const items = satisfaction.filter(s => s.classe === cls);
            return {
                x: labels,
                y: fields.map(f => DataStore.avg(items, f)),
                name: cls, type: 'bar',
                marker: { color: colors[ci], opacity: 0.85 },
            };
        });

        const layout = {
            ...getPlotlyTheme(),
            barmode: 'group',
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Note /10', range: [0, 10] },
            legend: { orientation: 'h', y: 1.12, font: { size: 11 } },
        };

        Plotly.newPlot('chart-sat-class', traces, layout, plotlyConfig);
    },

    renderSatisfactionByFidelity(satisfaction) {
        const programs = ['Non inscrit', 'Explorer', 'Silver', 'Gold', 'Platinum'];
        const filtered = satisfaction.filter(s => programs.includes(s.programme_fidelite));
        const data = programs.map(p => {
            const items = filtered.filter(s => s.programme_fidelite === p);
            return { program: p, note: DataStore.avg(items, 'note_globale'), count: items.length };
        }).filter(d => d.count > 0);

        const trace = {
            x: data.map(d => d.program),
            y: data.map(d => d.note),
            type: 'bar',
            marker: {
                color: data.map((d, i) => AF_COLORS.sequential[2 + i * 2] || AF_COLORS.navy),
            },
            text: data.map(d => d.note.toFixed(1)),
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Note globale /10', range: [0, 10] },
        };

        Plotly.newPlot('chart-sat-fidelity', [trace], layout, plotlyConfig);
    },

    renderSatisfactionTrend(satisfaction) {
        const grouped = DataStore.groupBy(satisfaction, s => s._yearMonth);
        const months = Object.keys(grouped).sort();
        const avgNotes = months.map(m => DataStore.avg(grouped[m], 'note_globale'));

        const trace = {
            x: months, y: avgNotes,
            type: 'scatter', mode: 'lines+markers',
            line: { color: AF_COLORS.navy, width: 3, shape: 'spline' },
            marker: { size: 5, color: AF_COLORS.navy },
            fill: 'tozeroy', fillcolor: 'rgba(0, 33, 87, 0.06)',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'Note globale /10', range: [5, 10] },
        };

        Plotly.newPlot('chart-sat-trend', [trace], layout, plotlyConfig);
    },

    renderSatisfactionByTraveler(satisfaction) {
        const types = ['Affaires', 'Loisirs', 'Famille', 'Solo'];
        const data = types.map(t => {
            const items = satisfaction.filter(s => s.type_voyageur === t);
            return { type: t, note: DataStore.avg(items, 'note_globale'), count: items.length };
        }).filter(d => d.count > 0);

        const trace = {
            labels: data.map(d => d.type),
            values: data.map(d => d.count),
            type: 'pie', hole: 0.5,
            marker: { colors: AF_COLORS.categorical },
            textinfo: 'percent+label',
            customdata: data.map(d => d.note.toFixed(1)),
            hovertemplate: '%{label}<br>%{value} réponses<br>Note: %{customdata}/10<extra></extra>',
        };

        const layout = { ...getPlotlyTheme(), showlegend: false };
        Plotly.newPlot('chart-sat-traveler', [trace], layout, plotlyConfig);
    },

    // ================================================================
    // ENVIRONMENT PAGE
    // ================================================================

    renderEnvironmentKPIs(flights) {
        const totalCO2 = DataStore.sum(flights, 'co2_tonnes');
        const totalRPK = DataStore.sum(flights, 'rpk');
        const co2PerPaxKm = totalRPK > 0 ? (totalCO2 * 1e6 / totalRPK) : 0;
        const totalFuel = DataStore.sum(flights, 'carburant_litres');
        const fuelPerPaxKm = totalRPK > 0 ? (totalFuel / totalRPK) : 0;

        document.getElementById('env-total-co2').textContent = (totalCO2 / 1000).toFixed(1);
        document.getElementById('env-co2-paxkm').textContent = co2PerPaxKm.toFixed(1);
        document.getElementById('env-fuel-total').textContent = (totalFuel / 1e6).toFixed(1);
        document.getElementById('env-fuel-paxkm').textContent = fuelPerPaxKm.toFixed(4);
    },

    renderCO2Monthly(flights) {
        const grouped = DataStore.groupBy(flights, f => f._yearMonth);
        const months = Object.keys(grouped).sort();

        const co2 = months.map(m => grouped[m].reduce((s, f) => s + f.co2_tonnes, 0));

        const trace = {
            x: months, y: co2, type: 'bar',
            marker: {
                color: co2.map(v => {
                    const max = Math.max(...co2);
                    const t = v / max;
                    return t > 0.8 ? AF_COLORS.red : t > 0.5 ? AF_COLORS.gold : '#10b981';
                }),
                opacity: 0.8,
            },
            hovertemplate: '%{x}: %{y:,.0f} t CO₂<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'CO₂ (tonnes)' },
        };

        Plotly.newPlot('chart-co2-monthly', [trace], layout, plotlyConfig);
    },

    renderCO2ByAircraft(flights) {
        const grouped = DataStore.groupBy(flights, f => f.type_avion);
        const data = Object.entries(grouped).map(([type, items]) => {
            const rpk = items.reduce((s, f) => s + f.rpk, 0);
            const co2 = items.reduce((s, f) => s + f.co2_tonnes, 0);
            return { type, efficiency: rpk > 0 ? co2 * 1e6 / rpk : 0 };
        }).sort((a, b) => a.efficiency - b.efficiency);

        const trace = {
            x: data.map(d => d.type),
            y: data.map(d => d.efficiency),
            type: 'bar',
            marker: {
                color: data.map(d => d.efficiency < 80 ? '#10b981' : d.efficiency < 100 ? AF_COLORS.gold : AF_COLORS.red),
                opacity: 0.85,
            },
            text: data.map(d => d.efficiency.toFixed(1)),
            textposition: 'outside',
        };

        const layout = {
            ...getPlotlyTheme(),
            yaxis: { ...getPlotlyTheme().yaxis, title: 'g CO₂ / pax·km' },
            xaxis: { ...getPlotlyTheme().xaxis, tickangle: -30 },
        };

        Plotly.newPlot('chart-co2-aircraft', [trace], layout, plotlyConfig);
    },

    renderFuelCourrier(flights) {
        const grouped = DataStore.groupBy(flights, f => f.courrier);
        const data = Object.entries(grouped).map(([c, items]) => ({
            courrier: c,
            fuel: items.reduce((s, f) => s + f.carburant_litres, 0),
        }));

        const trace = {
            labels: data.map(d => d.courrier),
            values: data.map(d => d.fuel),
            type: 'pie', hole: 0.55,
            marker: { colors: [AF_COLORS.sky, AF_COLORS.gold, AF_COLORS.navy] },
            textinfo: 'percent+label',
        };

        const layout = { ...getPlotlyTheme(), showlegend: false };
        Plotly.newPlot('chart-fuel-courrier', [trace], layout, plotlyConfig);
    },

    renderCO2Scatter(flights) {
        const sample = flights.filter(() => Math.random() < 0.03);

        const trace = {
            x: sample.map(f => f.distance_km),
            y: sample.map(f => f.rpk > 0 ? f.co2_tonnes * 1e6 / f.rpk : 0),
            mode: 'markers', type: 'scatter',
            marker: {
                size: 5,
                color: sample.map(f => f.taux_remplissage),
                colorscale: [[0, AF_COLORS.red], [1, '#10b981']],
                opacity: 0.5,
                colorbar: { title: 'Load', thickness: 10, len: 0.6 },
            },
            hovertemplate: 'Distance: %{x:.0f} km<br>Intensité: %{y:.1f} g CO₂/pax·km<extra></extra>',
        };

        const layout = {
            ...getPlotlyTheme(),
            xaxis: { ...getPlotlyTheme().xaxis, title: 'Distance (km)' },
            yaxis: { ...getPlotlyTheme().yaxis, title: 'g CO₂ / pax·km' },
        };

        Plotly.newPlot('chart-co2-scatter', [trace], layout, plotlyConfig);
    },
};