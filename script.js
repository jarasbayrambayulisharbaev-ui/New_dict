document.addEventListener('DOMContentLoaded', () => {
    
    // --- Fayl nomlari (data/ papkasida joylashgan) ---
    const DICTIONARY_FILES = {
        'main-dictionary': 'data/dictionary.csv',
        'proverbs-dictionary': 'data/proverbs.csv',
        'names-dictionary': 'data/names.csv',
        'phraseology-dictionary': 'data/phraseology.csv',
        'orphography-dictionary': 'data/orphography.csv' // Eger fayl atı orthography bolsa, solay ózgertiń
    };
    
    // Qaraqalpaq latın álipbesi
    function getCyrillicAlphabet() {
        return ['А', 'Á', 'B', 'D', 'E', 'F', 'G', 'Ǵ', 'J', 'Z', 'Í', 'I', 'K', 'Q', 'L', 'M', 'N', 'Ń', 'O', 'Ó', 'P', 'R', 'S', 'T', 'U', 'Ú', 'F', 'X', 'H', 'C', 'Ch', 'Sh'];
    }

    // Lug'at ma'lumotlarini saqlash uchun ob'ekt
    const dictionaries = {};

    // Elementlarga murojaatni tayyorlash
    Object.keys(DICTIONARY_FILES).forEach(key => {
        const isMain = key === 'main-dictionary';
        const inputId = isMain ? 'searchInput' : key.replace('-dictionary', 'SearchInput');
        const buttonId = isMain ? 'searchButton' : key.replace('-dictionary', 'SearchButton');
        const resultsId = isMain ? 'resultsArea' : key.replace('-dictionary', 'ResultsArea');
        const indexListId = isMain ? 'mainIndexList' : key.replace('-dictionary', 'IndexList');
        
        dictionaries[key] = {
            file: DICTIONARY_FILES[key],
            data: {},
            input: document.getElementById(inputId),
            button: document.getElementById(buttonId),
            results: document.getElementById(resultsId),
            indexList: document.getElementById(indexListId),
            alphabet: getCyrillicAlphabet(),
            placeholder: document.querySelector(`#${key} .search-area-wrapper p`) ? document.querySelector(`#${key} .search-area-wrapper p`).textContent : 'Izlew...',
            searchOptions: document.querySelectorAll(`input[name="search-type-${key.replace('-dictionary', '')}"]`)
        };
    });

    const navLinks = document.querySelectorAll('nav .nav-link');
    const dictionarySections = document.querySelectorAll('.dictionary-section, .info-section');
    
    // --- CSV tahlil qilish funksiyasi ---
    function parseProtectedLine(line) {
        const fields = []; let currentField = ''; let inQuotes = false; const len = line.length;
        for (let i = 0; i < len; i++) {
            const char = line[i]; const nextChar = (i < len - 1) ? line[i + 1] : null;
            if (char === '"') {
                if (inQuotes && nextChar === '"') { currentField += '"'; i++; } else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) { fields.push(currentField.trim()); currentField = ''; } 
            else { currentField += char; }
        }
        fields.push(currentField.trim());
        if (fields.length >= 2) {
            return { word: fields[0], definition: fields.slice(1).join(',').trim() };
        } else if (fields.length === 1 && fields[0]) {
            return { word: fields[0], definition: '' };
        }
        return null;
    }

    // --- Index List ushın element jaratıw ---
    function createIndexListItem(dictKey, word, definition) {
        const listItem = document.createElement('li');
        let displayWord = word.charAt(0).toUpperCase() + word.slice(1);
        
        if (dictKey === 'proverbs-dictionary' || dictKey === 'phraseology-dictionary') {
             displayWord = displayWord.replace(/\\n/g, '<br>');
        }
        
        listItem.innerHTML = displayWord;
        
        listItem.addEventListener('click', () => {
            const dict = dictionaries[dictKey];
            const activeItems = dict.indexList.querySelectorAll('li.selected');
            activeItems.forEach(item => item.classList.remove('selected'));
            listItem.classList.add('selected');
            
            let resultDefinition = definition;
            if (dictKey === 'proverbs-dictionary' || dictKey === 'phraseology-dictionary') {
                 resultDefinition = resultDefinition.replace(/\\n/g, '<br>');
            }
            
            const definitionHtml = resultDefinition ? `<span class="definition-text">: ${resultDefinition}</span>` : '';

            if (dict.results) { 
                dict.results.innerHTML = `<div class="index-word-result"><strong>${word}</strong>${definitionHtml}</div>`;
                dict.results.scrollIntoView({ behavior: 'smooth' });
            }
            if (dict.input) dict.input.value = ''; 
        });
        return listItem;
    }
    
    // --- Index ro'yxatini yaratish ---
    function buildIndexList(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict || !dict.indexList || Object.keys(dict.data).length === 0) return; 
        
        dict.indexList.classList.remove('loading-state');
        const words = Object.keys(dict.data).sort((a, b) => a.localeCompare(b, 'kar', { sensitivity: 'base' }));
        dict.indexList.innerHTML = ''; 

        const alphaContainer = document.createElement('div');
        alphaContainer.classList.add('alpha-filter');
        dict.indexList.appendChild(alphaContainer);
        
        const listContainer = document.createElement('ul');
        dict.indexList.appendChild(listContainer);

        const groups = {};
        words.forEach(word => {
            let groupLetter = dict.alphabet.find(l => word.toUpperCase().startsWith(l.toUpperCase()));
            if (groupLetter) {
                if (!groups[groupLetter]) { groups[groupLetter] = []; }
                groups[groupLetter].push(word);
            }
        });
        
        const showWordsByLetter = (letter) => {
            listContainer.innerHTML = '';
            const wordsToShow = groups[letter];
            if (wordsToShow) {
                wordsToShow.forEach(word => {
                    listContainer.appendChild(createIndexListItem(dictKey, word, dict.data[word]));
                });
            } else {
                listContainer.innerHTML = '<p style="text-align:center; color:#e74c3c;">Bul háripke tiyisli sóz tabılmadı.</p>';
            }
        };

        dict.alphabet.forEach(letter => {
            if (groups[letter] && groups[letter].length > 0) {
                const button = document.createElement('button');
                button.textContent = letter;
                button.addEventListener('click', () => {
                    alphaContainer.querySelectorAll('.active').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    showWordsByLetter(letter);
                });
                alphaContainer.appendChild(button);
            }
        });
        
        const firstAvailableLetter = dict.alphabet.find(letter => groups[letter] && groups[letter].length > 0);
        if (firstAvailableLetter) {
            const firstButton = Array.from(alphaContainer.querySelectorAll('button')).find(btn => btn.textContent === firstAvailableLetter);
            if (firstButton) {
                firstButton.classList.add('active');
                showWordsByLetter(firstAvailableLetter); 
            }
        }
    }

    // --- Lug'at faylini yuklash ---
    function loadDictionary(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict || !dict.input) return;

        dict.input.disabled = true;
        dict.results.innerHTML = '<p class="initial-message">Sózlik júklenbekte...</p>';
        dict.indexList.innerHTML = '<div class="loader-placeholder">Júklenbekte...</div>'; 

        fetch(dict.file)
             .then(response => {
                 if (!response.ok) throw new Error(`Fayl ${dict.file} tabılmadı.`); 
                 return response.text();
             })
             .then(text => {
                 const lines = text.split('\n').filter(line => line.trim() !== '');
                 dict.data = {}; 
                 lines.forEach(line => {
                     const parsed = parseProtectedLine(line);
                     if (parsed) { dict.data[parsed.word.toLowerCase()] = parsed.definition; }
                 });

                 dict.input.disabled = false;
                 if(dict.button) dict.button.disabled = false;

                 if (Object.keys(dict.data).length > 0) {
                     dict.results.innerHTML = `<p class="initial-message">Sózlik júklendi. ${Object.keys(dict.data).length} sóz bar.</p>`;
                     buildIndexList(dictKey); 
                 }
             })
             .catch(error => {
                 console.error(`❌ JÚKLEW QÁTESI:`, error);
                 dict.results.innerHTML = `<p class="no-results-message" style="color:red;">❌ Qáte: ${error.message}</p>`;
             });
    }

    // --- Qidiruv funksiyasi ---
    function performSearch(dictKey) {
        const dict = dictionaries[dictKey];
        if (!dict || !dict.input.value.trim()) return;

        const searchTerm = dict.input.value.toLowerCase().trim();
        const searchType = dict.searchOptions ? Array.from(dict.searchOptions).find(radio => radio.checked).value : 'includes';
        const matchingWords = Object.keys(dict.data).filter(word => 
            searchType === 'startswith' ? word.startsWith(searchTerm) : word.includes(searchTerm)
        ).sort();

        dict.results.innerHTML = '';
        if (matchingWords.length > 0) {
            matchingWords.forEach(word => {
                const resultElement = document.createElement('p');
                resultElement.innerHTML = `<strong>${word}</strong>: ${dict.data[word]}`;
                dict.results.appendChild(resultElement);
            });
        } else {
            dict.results.innerHTML = '<p class="no-results-message">Heshqanday sóz tabılmadı.</p>';
        }
    }

    // --- Navigatsiya ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            document.querySelectorAll('nav a').forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            dictionarySections.forEach(section => section.classList.add('hidden-section'));
            const targetElement = document.getElementById(targetId);
            if(targetElement) {
                targetElement.classList.remove('hidden-section');
                if (dictionaries[targetId] && dictionaries[targetId].input) {
                    dictionaries[targetId].input.value = '';
                    // ReferenceError durıslandı (dictionaries)
                    dictionaries[targetId].results.innerHTML = '<p class="initial-message">Izlew nátiyjeleri bul jerde kórinedi.</p>';
                }
            }
        });
    });

    Object.keys(dictionaries).forEach(loadDictionary); 
    Object.keys(dictionaries).forEach(dictKey => {
        const dict = dictionaries[dictKey];
        if (dict.input) dict.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(dictKey); });
        if (dict.button) dict.button.addEventListener('click', () => performSearch(dictKey));
    });
});
