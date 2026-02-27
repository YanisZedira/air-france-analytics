/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Data Layer
 * Chargement et traitement des données CSV
 * ============================================================================
 */

const DataStore = {
    airports: [],
    fleet: [],
    flights: [],
    satisfaction: [],
    loaded: false,

    async loadAll(onProgress) {
        const files = [
            { key: 'airports', path: 'data/aeroports.csv', label: 'Aéroports' },
            { key: 'fleet', path: 'data/flotte.csv', label: 'Flotte' },
            { key: 'flights', path: 'data/vols.csv', label: 'Vols' },
            { key: 'satisfaction', path: 'data/satisfaction.csv', label: 'Satisfaction' }
        ];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            onProgress(((i + 0.5) / files.length) * 100, `Chargement: ${file.label}...`);
            
            try {
                const data = await this.loadCSV(file.path);
                this[file.key] = data;
            } catch (e) {
                console.warn(`Fichier ${file.path} non trouvé, génération de données démo...`);
                this[file.key] = this.generateDemo(file.key);
            }
            
            onProgress(((i + 1) / files.length) * 100, `${file.label} chargé`);
        }

        this.processData();
        this.loaded = true;
        onProgress(100, 'Prêt !');
    },

    loadCSV(path) {
        return new Promise((resolve, reject) => {
            Papa.parse(path, {
                download: true,
                header: true,
                delimiter: ';',
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => reject(err)
            });
        });
    },

    processData() {
        // Process flights
        this.flights.forEach(f => {
            f._date = new Date(f.date_vol);
            f._year = f._date.getFullYear();
            f._month = f._date.getMonth() + 1;
            f._yearMonth = `${f._year}-${String(f._month).padStart(2, '0')}`;
            f._dayOfWeek = f._date.getDay();
            
            if (f.heure_depart) {
                const parts = String(f.heure_depart).split(':');
                f._hour = parseInt(parts[0]) || 12;
            } else {
                f._hour = 12;
            }

            // Ensure numeric values
            f.passagers = Number(f.passagers) || 0;
            f.capacite = Number(f.capacite) || 0;
            f.taux_remplissage = Number(f.taux_remplissage) || 0;
            f.revenu_vol_eur = Number(f.revenu_vol_eur) || 0;
            f.distance_km = Number(f.distance_km) || 0;
            f.co2_tonnes = Number(f.co2_tonnes) || 0;
            f.carburant_litres = Number(f.carburant_litres) || 0;
            f.retard_depart_min = Number(f.retard_depart_min) || 0;
            f.rpk = Number(f.rpk) || (f.passagers * f.distance_km);
            f.ask = Number(f.ask) || (f.capacite * f.distance_km);
        });

        // Process satisfaction
        this.satisfaction.forEach(s => {
            s._date = new Date(s.date_vol);
            s._yearMonth = `${s._date.getFullYear()}-${String(s._date.getMonth() + 1).padStart(2, '0')}`;
            s.note_globale = Number(s.note_globale) || 0;
            s.note_confort = Number(s.note_confort) || 0;
            s.note_repas = Number(s.note_repas) || 0;
            s.note_divertissement = Number(s.note_divertissement) || 0;
            s.note_equipage = Number(s.note_equipage) || 0;
            s.note_ponctualite = Number(s.note_ponctualite) || 0;
            s.note_enregistrement = Number(s.note_enregistrement) || 0;
        });

        // Process fleet
        this.fleet.forEach(a => {
            a.age_avion_ans = Number(a.age_avion_ans) || 0;
            a.nb_sieges_total = Number(a.nb_sieges_total) || 0;
        });

        console.log(`✅ Données chargées: ${this.flights.length} vols, ${this.airports.length} aéroports`);
    },

    // Filtrage
    filter(year, type) {
        let data = this.flights;
        if (year && year !== 'all') {
            data = data.filter(f => f._year === parseInt(year));
        }
        if (type && type !== 'all') {
            data = data.filter(f => f.courrier === type);
        }
        return data;
    },

    filterSatisfaction(year, type) {
        let data = this.satisfaction;
        if (year && year !== 'all') {
            data = data.filter(s => s._date.getFullYear() === parseInt(year));
        }
        if (type && type !== 'all') {
            data = data.filter(s => s.courrier === type);
        }
        return data;
    },

    // Helpers
    groupBy(arr, keyFn) {
        return arr.reduce((acc, item) => {
            const key = keyFn(item);
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
    },

    sum(arr, field) {
        return arr.reduce((s, x) => s + (Number(x[field]) || 0), 0);
    },

    avg(arr, field) {
        if (!arr.length) return 0;
        return this.sum(arr, field) / arr.length;
    },

    // Données démo si pas de CSV
    generateDemo(key) {
        if (key === 'airports') {
            return [
                { code_iata: 'CDG', nom: 'Paris CDG', ville: 'Paris', pays: 'France', continent: 'Europe', latitude: 49.01, longitude: 2.55, type_aeroport: 'Hub' },
                { code_iata: 'JFK', nom: 'New York JFK', ville: 'New York', pays: 'États-Unis', continent: 'Amérique du Nord', latitude: 40.64, longitude: -73.78, type_aeroport: 'Long-courrier' },
                { code_iata: 'NRT', nom: 'Tokyo Narita', ville: 'Tokyo', pays: 'Japon', continent: 'Asie', latitude: 35.77, longitude: 140.39, type_aeroport: 'Long-courrier' },
                { code_iata: 'DXB', nom: 'Dubai', ville: 'Dubaï', pays: 'EAU', continent: 'Moyen-Orient', latitude: 25.25, longitude: 55.36, type_aeroport: 'Long-courrier' },
                { code_iata: 'LHR', nom: 'London Heathrow', ville: 'Londres', pays: 'Royaume-Uni', continent: 'Europe', latitude: 51.47, longitude: -0.45, type_aeroport: 'Européen' },
                { code_iata: 'MRS', nom: 'Marseille', ville: 'Marseille', pays: 'France', continent: 'Europe', latitude: 43.44, longitude: 5.22, type_aeroport: 'Domestique' },
                { code_iata: 'NCE', nom: 'Nice', ville: 'Nice', pays: 'France', continent: 'Europe', latitude: 43.66, longitude: 7.22, type_aeroport: 'Domestique' },
                { code_iata: 'GRU', nom: 'São Paulo', ville: 'São Paulo', pays: 'Brésil', continent: 'Amérique du Sud', latitude: -23.44, longitude: -46.47, type_aeroport: 'Long-courrier' },
            ];
        }

        if (key === 'fleet') {
            const types = [
                { type: 'Airbus A350-900', famille: 'Wide-body', seats: 324, range: 15000, engine: 'Trent XWB', count: 18 },
                { type: 'Boeing 777-300ER', famille: 'Wide-body', seats: 468, range: 13650, engine: 'GE90-115B', count: 15 },
                { type: 'Airbus A320', famille: 'Narrow-body', seats: 178, range: 6150, engine: 'CFM56-5B', count: 20 },
                { type: 'Boeing 787-9', famille: 'Wide-body', seats: 276, range: 14140, engine: 'GEnx-1B', count: 10 },
                { type: 'Airbus A330-200', famille: 'Wide-body', seats: 224, range: 13450, engine: 'CF6-80E1', count: 10 },
            ];
            
            return types.flatMap(t => 
                Array.from({ length: t.count }, (_, i) => ({
                    immatriculation: `F-G${t.type.charAt(7)}${String.fromCharCode(65 + i)}${String.fromCharCode(65 + (i % 26))}`,
                    type_avion: t.type,
                    famille: t.famille,
                    nb_sieges_total: t.seats,
                    age_avion_ans: Math.round((2 + Math.random() * 18) * 10) / 10,
                    statut: Math.random() > 0.05 ? 'En service' : 'Maintenance',
                    base: Math.random() > 0.3 ? 'CDG' : 'ORY',
                    autonomie_km: t.range,
                    motorisation: t.engine,
                }))
            );
        }

        if (key === 'flights') {
            const flights = [];
            const routes = [
                ['CDG', 'JFK', 'Long-courrier', 5835], ['CDG', 'NRT', 'Long-courrier', 9712],
                ['CDG', 'LHR', 'Court-courrier', 345], ['CDG', 'MRS', 'Court-courrier', 660],
                ['CDG', 'DXB', 'Long-courrier', 5246], ['CDG', 'GRU', 'Long-courrier', 9168],
                ['CDG', 'NCE', 'Court-courrier', 686],
            ];
            const types = ['Airbus A350-900', 'Boeing 777-300ER', 'Airbus A320'];

            for (let d = 0; d < 500; d++) {
                const date = new Date(2024, 0, 1);
                date.setDate(date.getDate() + d);
                
                routes.forEach(([dep, arr, courrier, dist]) => {
                    const numFlights = 1 + Math.floor(Math.random() * 3);
                    for (let n = 0; n < numFlights; n++) {
                        const capacity = 180 + Math.floor(Math.random() * 200);
                        const loadFactor = 0.65 + Math.random() * 0.30;
                        const pax = Math.floor(capacity * loadFactor);
                        const delay = Math.random() < 0.7 ? Math.floor(Math.random() * 15) : Math.floor(Math.random() * 120);
                        const revPerPax = courrier === 'Long-courrier' ? 400 + Math.random() * 1000 : 80 + Math.random() * 200;

                        flights.push({
                            vol_id: `VOL-${String(flights.length).padStart(6, '0')}`,
                            numero_vol: `AF${1000 + (flights.length % 900)}`,
                            date_vol: date.toISOString().slice(0, 10),
                            aeroport_depart: dep,
                            aeroport_arrivee: arr,
                            continent_destination: arr === 'JFK' ? 'Amérique du Nord' : arr === 'NRT' ? 'Asie' : arr === 'GRU' ? 'Amérique du Sud' : 'Europe',
                            courrier: courrier,
                            distance_km: dist,
                            heure_depart: `${8 + Math.floor(Math.random() * 14)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                            retard_depart_min: delay,
                            statut_vol: delay > 15 ? 'Retardé' : 'À l\'heure',
                            type_avion: types[Math.floor(Math.random() * types.length)],
                            capacite: capacity,
                            passagers: pax,
                            taux_remplissage: loadFactor,
                            revenu_vol_eur: pax * revPerPax,
                            revenu_par_pax_eur: revPerPax,
                            carburant_litres: dist * 3.5 * capacity / 100,
                            co2_tonnes: dist * 3.5 * capacity / 100 * 0.8 * 3.16 / 1e6,
                            cause_retard: delay > 15 ? ['Météo', 'Technique', 'ATC'][Math.floor(Math.random() * 3)] : 'Aucun',
                            rpk: pax * dist,
                            ask: capacity * dist,
                        });
                    }
                });
            }
            return flights;
        }

        if (key === 'satisfaction') {
            return Array.from({ length: 5000 }, (_, i) => ({
                survey_id: `SAT-${String(i).padStart(6, '0')}`,
                date_vol: new Date(2024, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)).toISOString().slice(0, 10),
                courrier: ['Court-courrier', 'Moyen-courrier', 'Long-courrier'][Math.floor(Math.random() * 3)],
                classe: ['Business', 'Premium Éco', 'Économique'][Math.floor(Math.random() * 3)],
                note_globale: parseFloat((5 + Math.random() * 5).toFixed(1)),
                note_confort: parseFloat((5 + Math.random() * 5).toFixed(1)),
                note_repas: parseFloat((4 + Math.random() * 6).toFixed(1)),
                note_divertissement: parseFloat((5 + Math.random() * 5).toFixed(1)),
                note_equipage: parseFloat((6 + Math.random() * 4).toFixed(1)),
                note_ponctualite: parseFloat((4 + Math.random() * 6).toFixed(1)),
                note_enregistrement: parseFloat((5 + Math.random() * 5).toFixed(1)),
                nps_categorie: ['Promoteur', 'Passif', 'Détracteur'][Math.floor(Math.random() * 3)],
                recommandation: ['Oui', 'Non', 'Peut-être'][Math.floor(Math.random() * 3)],
                type_voyageur: ['Affaires', 'Loisirs', 'Famille', 'Solo'][Math.floor(Math.random() * 4)],
                programme_fidelite: ['Explorer', 'Silver', 'Gold', 'Platinum', 'Non inscrit'][Math.floor(Math.random() * 5)],
            }));
        }

        return [];
    }
};
