/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Data Layer
 * Chargement CSV, parsing, agrégations
 * ============================================================================
 */

const DataStore = {
    airports: [],
    fleet: [],
    flights: [],
    satisfaction: [],
    loaded: false,

    // ── Aggregated caches ──
    _cache: {},

    async loadAll(progressCallback) {
        const files = [
            { key: 'airports', file: 'data/aeroports.csv', label: 'Aéroports' },
            { key: 'fleet', file: 'data/flotte.csv', label: 'Flotte' },
            { key: 'flights', file: 'data/vols.csv', label: 'Vols' },
            { key: 'satisfaction', file: 'data/satisfaction.csv', label: 'Satisfaction' },
        ];

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            progressCallback((i / files.length) * 100, `Chargement : ${f.label}...`);
            try {
                const raw = await this.fetchCSV(f.file);
                this[f.key] = raw;
            } catch (e) {
                console.warn(`Fichier ${f.file} non trouvé, génération de données de démo...`);
                this[f.key] = this.generateFallback(f.key);
            }
        }

        this.processData();
        progressCallback(100, 'Prêt !');
        this.loaded = true;
    },

    fetchCSV(path) {
        return new Promise((resolve, reject) => {
            Papa.parse(path, {
                download: true,
                header: true,
                delimiter: ';',
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => reject(err),
            });
        });
    },

    processData() {
        // Parse dates and add computed fields
        this.flights.forEach(f => {
            f._date = new Date(f.date_vol);
            f._year = f._date.getFullYear();
            f._month = f._date.getMonth() + 1;
            f._yearMonth = `${f._year}-${String(f._month).padStart(2, '0')}`;
            f._dayOfWeek = f._date.getDay(); // 0=Sun
            if (f.heure_depart) {
                const parts = String(f.heure_depart).split(':');
                f._hour = parseInt(parts[0]) || 0;
            } else {
                f._hour = 12;
            }
            f.retard_depart_min = Number(f.retard_depart_min) || 0;
            f.passagers = Number(f.passagers) || 0;
            f.capacite = Number(f.capacite) || 0;
            f.taux_remplissage = Number(f.taux_remplissage) || 0;
            f.revenu_vol_eur = Number(f.revenu_vol_eur) || 0;
            f.distance_km = Number(f.distance_km) || 0;
            f.co2_tonnes = Number(f.co2_tonnes) || 0;
            f.carburant_litres = Number(f.carburant_litres) || 0;
            f.rpk = Number(f.rpk) || 0;
            f.ask = Number(f.ask) || 0;
        });

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

        this.fleet.forEach(a => {
            a.age_avion_ans = Number(a.age_avion_ans) || 0;
            a.nb_sieges_total = Number(a.nb_sieges_total) || 0;
        });

        console.log(`✅ Data loaded: ${this.flights.length} flights, ${this.airports.length} airports, ${this.fleet.length} aircraft, ${this.satisfaction.length} surveys`);
    },

    // ── Filter helper ──
    getFilteredFlights(year, courrier) {
        let data = this.flights;
        if (year && year !== 'all') {
            data = data.filter(f => f._year === parseInt(year));
        }
        if (courrier && courrier !== 'all') {
            data = data.filter(f => f.courrier === courrier);
        }
        return data;
    },

    getFilteredSatisfaction(year, courrier) {
        let data = this.satisfaction;
        if (year && year !== 'all') {
            data = data.filter(s => s._date.getFullYear() === parseInt(year));
        }
        if (courrier && courrier !== 'all') {
            data = data.filter(s => s.courrier === courrier);
        }
        return data;
    },

    // ── Aggregation helpers ──
    groupBy(arr, keyFn) {
        const map = {};
        arr.forEach(item => {
            const k = keyFn(item);
            if (!map[k]) map[k] = [];
            map[k].push(item);
        });
        return map;
    },

    sum(arr, field) {
        return arr.reduce((s, x) => s + (Number(x[field]) || 0), 0);
    },

    avg(arr, field) {
        if (arr.length === 0) return 0;
        return this.sum(arr, field) / arr.length;
    },

    // ── Fallback data generation for demo ──
    generateFallback(key) {
        console.log(`Generating fallback data for: ${key}`);

        if (key === 'airports') {
            return [
                {code_iata:'CDG',nom:'Paris Charles de Gaulle',ville:'Paris',pays:'France',continent:'Europe',latitude:49.01,longitude:2.55,type_aeroport:'Hub'},
                {code_iata:'ORY',nom:'Paris Orly',ville:'Paris',pays:'France',continent:'Europe',latitude:48.72,longitude:2.38,type_aeroport:'Hub'},
                {code_iata:'JFK',nom:'New York JFK',ville:'New York',pays:'États-Unis',continent:'Amérique du Nord',latitude:40.64,longitude:-73.78,type_aeroport:'Long-courrier'},
                {code_iata:'NRT',nom:'Tokyo Narita',ville:'Tokyo',pays:'Japon',continent:'Asie',latitude:35.77,longitude:140.39,type_aeroport:'Long-courrier'},
                {code_iata:'LHR',nom:'London Heathrow',ville:'Londres',pays:'Royaume-Uni',continent:'Europe',latitude:51.47,longitude:-0.45,type_aeroport:'Européen'},
                {code_iata:'DXB',nom:'Dubai',ville:'Dubaï',pays:'Émirats Arabes Unis',continent:'Moyen-Orient',latitude:25.25,longitude:55.36,type_aeroport:'Long-courrier'},
                {code_iata:'GRU',nom:'São Paulo',ville:'São Paulo',pays:'Brésil',continent:'Amérique du Sud',latitude:-23.44,longitude:-46.47,type_aeroport:'Long-courrier'},
                {code_iata:'JNB',nom:'Johannesburg',ville:'Johannesburg',pays:'Afrique du Sud',continent:'Afrique',latitude:-26.14,longitude:28.25,type_aeroport:'Long-courrier'},
                {code_iata:'MRS',nom:'Marseille',ville:'Marseille',pays:'France',continent:'Europe',latitude:43.44,longitude:5.22,type_aeroport:'Domestique'},
                {code_iata:'NCE',nom:'Nice',ville:'Nice',pays:'France',continent:'Europe',latitude:43.66,longitude:7.22,type_aeroport:'Domestique'},
            ];
        }

        if (key === 'fleet') {
            const types = ['Airbus A350-900','Boeing 777-300ER','Airbus A320','Airbus A330-200','Boeing 787-9'];
            return types.flatMap((t, ti) =>
                Array.from({length: 10 + ti * 3}, (_, i) => ({
                    immatriculation: `F-G${String.fromCharCode(65+ti)}${String.fromCharCode(65+i)}${String.fromCharCode(65+(i%26))}`,
                    type_avion: t,
                    famille: t.includes('A320') || t.includes('A220') ? 'Narrow-body' : 'Wide-body',
                    nb_sieges_total: [324, 468, 178, 224, 276][ti],
                    age_avion_ans: Math.round((3 + Math.random() * 18) * 10) / 10,
                    statut: Math.random() > 0.05 ? 'En service' : 'Maintenance',
                    base: Math.random() > 0.3 ? 'CDG' : 'ORY',
                }))
            );
        }

        if (key === 'flights') {
            const flights = [];
            const routes = [
                ['CDG','JFK','Long-courrier',5835],['CDG','LHR','Court-courrier',345],
                ['CDG','NRT','Long-courrier',9712],['CDG','MRS','Court-courrier',660],
                ['CDG','DXB','Long-courrier',5246],['CDG','GRU','Long-courrier',9168],
            ];
            const types = ['Airbus A350-900','Boeing 777-300ER','Airbus A320'];
            for (let d = 0; d < 365; d++) {
                const date = new Date(2024, 0, 1 + d);
                routes.forEach(([dep, arr, courrier, dist]) => {
                    const nFlights = 1 + Math.floor(Math.random() * 3);
                    for (let n = 0; n < nFlights; n++) {
                        const pax = 100 + Math.floor(Math.random() * 250);
                        const delay = Math.random() < 0.7 ? Math.floor(Math.random() * 15) : Math.floor(Math.random() * 120);
                        flights.push({
                            vol_id: `VOL-${String(flights.length).padStart(6,'0')}`,
                            numero_vol: `AF${1000 + flights.length % 900}`,
                            date_vol: date.toISOString().slice(0, 10),
                            aeroport_depart: dep,
                            aeroport_arrivee: arr,
                            continent_destination: 'Europe',
                            courrier: courrier,
                            distance_km: dist,
                            heure_depart: `${8 + Math.floor(Math.random()*14)}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}`,
                            retard_depart_min: delay,
                            statut_vol: delay > 15 ? 'Retardé' : 'À l\'heure',
                            type_avion: types[Math.floor(Math.random() * types.length)],
                            capacite: 280,
                            passagers: pax,
                            taux_remplissage: pax / 280,
                            revenu_vol_eur: pax * (200 + Math.random() * 800),
                            revenu_par_pax_eur: 200 + Math.random() * 800,
                            carburant_litres: dist * 3.5 * 2.8,
                            co2_tonnes: dist * 3.5 * 2.8 * 0.8 * 3.16 / 1e6,
                            cause_retard: delay > 15 ? 'Météo' : 'Aucun',
                            rpk: pax * dist,
                            ask: 280 * dist,
                        });
                    }
                });
            }
            return flights;
        }

        if (key === 'satisfaction') {
            return Array.from({length: 5000}, (_, i) => ({
                survey_id: `SAT-${String(i).padStart(6, '0')}`,
                vol_id: `VOL-${String(Math.floor(Math.random()*5000)).padStart(6,'0')}`,
                date_vol: new Date(2024, Math.floor(Math.random()*12), 1 + Math.floor(Math.random()*28)).toISOString().slice(0,10),
                courrier: ['Court-courrier','Moyen-courrier','Long-courrier'][Math.floor(Math.random()*3)],
                classe: ['Business','Premium Éco','Économique'][Math.floor(Math.random()*3)],
                note_globale: (5 + Math.random() * 5).toFixed(1),
                note_confort: (5 + Math.random() * 5).toFixed(1),
                note_repas: (4 + Math.random() * 6).toFixed(1),
                note_divertissement: (5 + Math.random() * 5).toFixed(1),
                note_equipage: (6 + Math.random() * 4).toFixed(1),
                note_ponctualite: (4 + Math.random() * 6).toFixed(1),
                note_enregistrement: (5 + Math.random() * 5).toFixed(1),
                nps_categorie: ['Promoteur','Passif','Détracteur'][Math.floor(Math.random()*3)],
                recommandation: ['Oui','Non','Peut-être'][Math.floor(Math.random()*3)],
                type_voyageur: ['Affaires','Loisirs','Famille','Solo'][Math.floor(Math.random()*4)],
                programme_fidelite: ['Explorer','Silver','Gold','Platinum','Non inscrit'][Math.floor(Math.random()*5)],
                nationalite: ['Française','Américaine','Britannique','Autre'][Math.floor(Math.random()*4)],
            }));
        }

        return [];
    }
};
