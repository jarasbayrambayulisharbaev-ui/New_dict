document.addEventListener('DOMContentLoaded', () => {
    
    // --- Fayl nomlari (XML formatiga o'zgartirildi) ---
    const DICTIONARY_FILES = {
        'main-dictionary': 'data/dictionary.xml', // CSV o'rniga XML
        'proverbs-dictionary': 'data/proverbs.xml',
        'names-dictionary': 'data/names.xml',
        'phraseology-dictionary': 'data/phraseology.xml',
        'orphography-dictionary': 'data/orthography.xml'
    };
    
    // Qaraqalpaq kirill álipbesi (Siz bergan ma'lumotlar kirillda edi)
    function getCyrillicAlphabet() {
        return ['А', 'Ә', 'Б', 'В', 'Г', 'Ғ', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Қ', 'Л', 'M', 'Н', 'Ң', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ў', 'Ф', 'Х', 'Ҳ', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'];
    }

    const dictionaries = {};

    // Elementlarni tayyorlash
    Object.keys(DICTIONARY_FILES).forEach(key => {
        const isMain = key === 'main-dictionary';
        const inputId = isMain ? 'searchInput' : key.replace('-dictionary', 'SearchInput');
        const buttonId = isMain ? 'searchButton' : key.replace('-dictionary', 'SearchButton');
        const resultsId = isMain ? 'resultsArea' : key.replace('-dictionary', 'ResultsArea');
        const indexListId = isMain ? 'mainIndexList' : key.replace('-dictionary', 'IndexList');
        
        dictionaries[key] = {
            file: DICTIONARY_FILES[key],
            data: [], // XML struktura uchun massiv qulayroq
            input: document.getElementById(inputId),
            button: document.getElementById(buttonId),
            results: document.getElementById(resultsId),
            indexList: document.getElementById(indexListId),
            alphabet: getCyrillicAlphabet(),
            searchOptions: document.querySelectorAll(`input[name="search-type-${key.replace('-dictionary', '')}"]`)
        };
    });

    // --- XML tahlil qilish (Yangi funksiya) ---
    function parseXMLDictionary(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const entries = xmlDoc.getElementsByTagName("entry");
        const data = [];

        for (let entry of entries) {
            const word = entry.getAttribute("word");
            const senses = [];
            
            // Har bir ma'noni (sense) o'qish
            const senseElements = entry.getElementsByTagName("sense");
            if (senseElements.length > 0) {
                for (let s of senseElements) {
                    senses.push({
                        def: s.getElementsByTagName("definition")[0]?.textContent || "",
                        ex: s.getElementsByTagName("example")[0]?.textContent || "",
                        exQuote: s.getElementsByTagName("example")[0]?.getAttribute("quote") || "",
                        source: s.getElementsByTagName("source")[0]?.textContent || ""
                    });
                }
            } else {
                // Agar sense bo'lmasa, to'g'ridan-to'g'ri definition'ni oqish
                senses.push({
                    def: entry.getElementsByTagName("definition")[0]?.textContent || "",
                    ex: "", source: ""
                });
            }

            data.push({ word, senses, type: entry.getElementsByTagName("type")[0]?.textContent || "" });
        }
        return data;
    }

    // --- Natijani ekranga chiqarish ---
    function formatEntryHTML(entry) {
        let html = `<div class="entry-card">
            <h3 class="entry-word">${entry.word} <small>${entry.type}</small></h3>`;
        
        entry.senses.forEach((s, index) => {
            html += `<div class="sense-item">
                <p><strong>${entry.senses.length > 1 ? (index + 1) + '. ' : ''}</strong>${s.def}</p>`;
            if (s.exQuote) {
                html += `<i class="example-text">"${s.exQuote}"</i>`;
            }
            if (s.source) {
                html += `<span class="source-tag"> — ${s.source}</span>`;
            }
            html += `</div>`;
        });
        
        html += `</div>`;
        return html;
    }

    // --- Lug'at faylini yuklash ---
    function loadDictionary(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict || !dict.input) return;

        fetch(dict.file)
            .then(response => response.text())
            .then(xmlText => {
                dict.data = parseXMLDictionary(xmlText);
                buildIndexList(dictKey);
            })
            .catch(error => console.error("XML yuklashda xato:", error));
    }

    // --- Qidiruv funksiyasi (XML ma'lumotlariga moslandi) ---
    function performSearch(dictKey) {
        const dict = dictionaries[dictKey];
        const searchTerm = dict.input.value.toLowerCase().trim();
        if (!searchTerm) return;

        const results = dict.data.filter(item => item.word.toLowerCase().includes(searchTerm));
        
        dict.results.innerHTML = "";
        if (results.length > 0) {
            results.forEach(entry => {
                const div = document.createElement('div');
                div.innerHTML = formatEntryHTML(entry);
                dict.results.appendChild(div);
            });
        } else {
            dict.results.innerHTML = '<p>Sóz tabılmadı.</p>';
        }
    }

    // --- Index List (Alifbo bo'yicha saralash) ---
    function buildIndexList(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict.indexList || dict.data.length === 0) return;

        const listContainer = document.createElement('ul');
        dict.indexList.innerHTML = '';
        
        // Alifbo tugmachalarini yasash... (oldingi kodingizdagi buildIndexList mantiqi qoladi, 
        // faqat dict.data endi obyekt emas, massiv ekanini hisobga oling)
        const sortedData = [...dict.data].sort((a, b) => a.word.localeCompare(b.word, 'kk'));
        
        sortedData.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = entry.word;
            li.addEventListener('click', () => {
                dict.results.innerHTML = formatEntryHTML(entry);
                dict.results.scrollIntoView({ behavior: 'smooth' });
            });
            listContainer.appendChild(li);
        });
        dict.indexList.appendChild(listContainer);
    }

    // Ishga tushirish
    Object.keys(dictionaries).forEach(key => {
        loadDictionary(key);
        const dict = dictionaries[key];
        if (dict.button) dict.button.addEventListener('click', () => performSearch(key));
        if (dict.input) dict.input.addEventListener('keypress', (e) => { if(e.key === 'Enter') performSearch(key) });
    });
});
