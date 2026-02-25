document.addEventListener('DOMContentLoaded', () => {
    
    // --- Fayl nomlari (CSV formatida qoladi) ---
    const DICTIONARY_FILES = {
        'main-dictionary': 'data/dictionary.csv',
        'proverbs-dictionary': 'data/proverbs.csv',
        'names-dictionary': 'data/names.csv',
        'phraseology-dictionary': 'data/phraseology.csv',
        'orphography-dictionary': 'data/orphography.csv'
    };
    
    // Qaraqalpaq latın álipbesi
    function getAlphabet() {
        return ['A', 'Á', 'B', 'D', 'E', 'F', 'G', 'Ǵ', 'H', 'X', 'Í', 'I', 'J', 'K', 'Q', 'L', 'M', 'N', 'Ń', 'O', 'Ó', 'P', 'R', 'S', 'T', 'U', 'Ú', 'V', 'W', 'Y', 'Z', 'Sh', 'Ch'];
    }

    const dictionaries = {};

    // Lug'at obyektlarini tayyorlash
    Object.keys(DICTIONARY_FILES).forEach(key => {
        const isMain = key === 'main-dictionary';
        const suffix = isMain ? '' : key.replace('-dictionary', '').charAt(0).toUpperCase() + key.replace('-dictionary', '').slice(1);
        
        dictionaries[key] = {
            file: DICTIONARY_FILES[key],
            data: {},
            input: document.getElementById(isMain ? 'searchInput' : `search${suffix}Input`),
            button: document.getElementById(isMain ? 'searchButton' : `search${suffix}Button`),
            results: document.getElementById(isMain ? 'resultsArea' : `${key.replace('-dictionary', '')}ResultsArea`),
            indexList: document.getElementById(isMain ? 'mainIndexList' : `${key.replace('-dictionary', '')}IndexList`),
            alphabet: getAlphabet()
        };
    });

    // --- Ta'rifni vizual formatlash funksiyasi ---
    // Bu funksiya CSV ichidagi "1. Ta'rif [Misol] (Manba)" kabi matnlarni chiroyli qiladi
    function formatDefinition(text) {
        if (!text) return "";
        
        let formatted = text;
        // 1. Ma'no raqamlarini qalin qilish (1., 2. va h.k.)
        formatted = formatted.replace(/(\d+\.)/g, '<br><strong class="sense-num">$1</strong>');
        
        // 2. Kvadrat qavs ichidagi misollarni kursiv qilish [Misol matni]
        formatted = formatted.replace(/\[(.*?)\]/g, '<br><i class="example-text">"$1"</i>');
        
        // 3. Oddiy qavs ichidagi manbalarni kichikroq qilish (Manba nomi)
        formatted = formatted.replace(/\((.*?)\)/g, ' <small class="source-text">($1)</small>');

        return formatted;
    }

    // --- CSV tahlil qilish (Ilg'or variant) ---
    function parseProtectedLine(line) {
        const fields = []; let currentField = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i+1] === '"') { currentField += '"'; i++; } else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) { fields.push(currentField.trim()); currentField = ''; } 
            else { currentField += char; }
        }
        fields.push(currentField.trim());
        if (fields.length >= 2) return { word: fields[0], definition: fields.slice(1).join(',').trim() };
        return fields[0] ? { word: fields[0], definition: '' } : null;
    }

    // --- Index List uchun element yaratish ---
    function createIndexListItem(dictKey, word, definition) {
        const listItem = document.createElement('li');
        listItem.textContent = word.charAt(0).toUpperCase() + word.slice(1);
        
        listItem.addEventListener('click', () => {
            const dict = dictionaries[dictKey];
            dict.indexList.querySelectorAll('li.selected').forEach(li => li.classList.remove('selected'));
            listItem.classList.add('selected');
            
            // Natijani formatlab chiqarish
            dict.results.innerHTML = `
                <div class="result-card">
                    <h3 class="result-word">${word.toUpperCase()}</h3>
                    <div class="result-body">${formatDefinition(definition)}</div>
                </div>`;
            dict.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return listItem;
    }

    // --- Alifbo filtrini qurish ---
    function buildIndexList(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict.indexList) return;

        dict.indexList.innerHTML = '';
        const alphaContainer = document.createElement('div');
        alphaContainer.className = 'alpha-filter';
        const listUl = document.createElement('ul');

        const words = Object.keys(dict.data).sort((a, b) => a.localeCompare(b, 'uz-Latn-uz'));
        const groups = {};
        
        words.forEach(w => {
            const firstLetter = w.charAt(0).toUpperCase();
            // Qaraqalpaq maxsus harflari uchun tekshiruv (Á, Ǵ va h.k.)
            const keyLetter = dict.alphabet.find(l => w.toUpperCase().startsWith(l)) || firstLetter;
            if (!groups[keyLetter]) groups[keyLetter] = [];
            groups[keyLetter].push(w);
        });

        dict.alphabet.forEach(letter => {
            if (groups[letter]) {
                const btn = document.createElement('button');
                btn.textContent = letter;
                btn.onclick = () => {
                    alphaContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    listUl.innerHTML = '';
                    groups[letter].forEach(w => listUl.appendChild(createIndexListItem(dictKey, w, dict.data[w])));
                };
                alphaContainer.appendChild(btn);
            }
        });

        dict.indexList.append(alphaContainer, listUl);
        if (alphaContainer.firstChild) alphaContainer.firstChild.click();
    }

    // --- Lug'atni yuklash ---
    function loadDictionary(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict.file) return;

        fetch(dict.file)
            .then(res => res.text())
            .then(text => {
                const lines = text.split('\n').filter(l => l.trim() !== '');
                dict.data = {};
                lines.forEach(line => {
                    const parsed = parseProtectedLine(line);
                    if (parsed) dict.data[parsed.word.toLowerCase()] = parsed.definition;
                });
                buildIndexList(dictKey);
            })
            .catch(err => console.error(`${dictKey} yuklashda xato:`, err));
    }

    // --- Qidiruv ---
    function performSearch(dictKey) {
        const dict = dictionaries[dictKey];
        const term = dict.input.value.toLowerCase().trim();
        if (!term) return;

        const matches = Object.keys(dict.data).filter(w => w.includes(term));
        dict.results.innerHTML = matches.length > 0 
            ? matches.map(w => `
                <div class="result-card">
                    <h3>${w.toUpperCase()}</h3>
                    <p>${formatDefinition(dict.data[w])}</p>
                </div>`).join('')
            : '<p class="no-results">Heshqanday sóz tabılmadı.</p>';
    }

    // Boshlash
    Object.keys(dictionaries).forEach(key => {
        loadDictionary(key);
        const d = dictionaries[key];
        if (d.button) d.button.onclick = () => performSearch(key);
        if (d.input) d.input.onkeypress = (e) => { if (e.key === 'Enter') performSearch(key); };
    });
});
