/**
 * Voice Health - Развлекательный анализатор голоса
 * Версия: 1.0.0
 * Для публикации в RuStore (категория: Развлечения)
 */

(function() {
    'use strict';

    // ==================== DOM Элементы ====================
    const micButton = document.getElementById('micButton');
    const micWrapper = document.getElementById('micWrapper');
    const micHint = document.getElementById('micHint');
    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultDescription = document.getElementById('resultDescription');
    const progressFill = document.getElementById('progressFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const extraTips = document.getElementById('extraTips');
    const historyList = document.getElementById('historyList');

    // ==================== Состояние ====================
    let mediaRecorder = null;
    let audioChunks = [];
    let stream = null;
    let isRecording = false;
    let isProcessing = false;
    let recordingTimer = null;
    const MAX_RECORD_TIME = 4000; // 4 секунды максимум

    // ==================== Сценарии анализа ====================
    // Это РАЗВЛЕКАТЕЛЬНЫЕ сценарии. Не медицинские!
    const scenarios = [
        {
            id: 'sleep',
            icon: '😴',
            title: 'Вам нужен сон!',
            description: 'Ваш голос звучит уставшим. Тембр понижен, темп речи замедлен. Рекомендуется отдохнуть или устроить короткий дневной сон (20-30 минут).',
            tips: [
                'Попробуйте технику дыхания 4-7-8',
                'Избегайте кофеина за 6 часов до сна',
                'Проветрите комнату перед отдыхом'
            ],
            color: '#818cf8',
            weight: 30
        },
        {
            id: 'active',
            icon: '⚡',
            title: 'Требуется активность!',
            description: 'В голосе слышна некоторая зажатость и монотонность. Похоже, вы засиделись. Разминка или прогулка помогут взбодриться.',
            tips: [
                'Сделайте 10-минутную разминку',
                'Выйдите на короткую прогулку',
                'Попробуйте упражнения для шеи и плеч'
            ],
            color: '#f97316',
            weight: 25
        },
        {
            id: 'eat',
            icon: '🍎',
            title: 'Пора перекусить!',
            description: 'Анализ показывает признаки снижения энергии. Вероятно, уровень глюкозы снизился. Рекомендуется полезный перекус или приём пищи.',
            tips: [
                'Фрукты или орехи — отличный выбор',
                'Не забудьте выпить стакан воды',
                'Избегайте сладких снеков — дадут временный эффект'
            ],
            color: '#34d399',
            weight: 25
        },
        {
            id: 'chill',
            icon: '🧘',
            title: 'Вы в отличной форме!',
            description: 'Ваш голос звучит ровно и уверенно. Энергетический баланс в норме. Продолжайте в том же духе!',
            tips: [
                'Поддерживайте водный баланс',
                'Сделайте пятиминутную медитацию',
                'Поделитесь хорошим настроением с близкими'
            ],
            color: '#a78bfa',
            weight: 20
        }
    ];

    // История анализов (хранится в памяти + localStorage)
    let history = JSON.parse(localStorage.getItem('voiceHealthHistory') || '[]');

    // ==================== Функции ====================

    /**
     * Получить случайный сценарий с учётом весов
     */
    function getWeightedRandomScenario() {
        const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const scenario of scenarios) {
            random -= scenario.weight;
            if (random <= 0) return scenario;
        }
        return scenarios[scenarios.length - 1];
    }

    /**
     * Сгенерировать "точность анализа" (72-97%)
     */
    function getAccuracy() {
        return Math.floor(Math.random() * 25) + 72;
    }

    /**
     * Обновить UI с результатом
     */
    function updateResultUI(scenario) {
        const accuracy = getAccuracy();
        
        // Анимируем смену
        resultCard.style.transition = 'all 0.3s ease';
        resultCard.style.borderColor = scenario.color + '70';
        resultCard.style.boxShadow = `0 15px 35px -10px ${scenario.color}40`;
        
        // Обновляем полосу сверху карточки
        const topBar = resultCard.querySelector('::before');
        resultCard.style.setProperty('--accent-color', scenario.color);
        
        resultIcon.textContent = scenario.icon;
        resultIcon.style.animation = 'none';
        setTimeout(() => resultIcon.style.animation = 'fadeIn 0.5s ease', 10);
        
        resultTitle.textContent = scenario.title;
        resultDescription.textContent = scenario.description;
        
        // Шкала уверенности
        progressFill.style.width = accuracy + '%';
        progressFill.style.background = scenario.color;
        confidenceValue.textContent = accuracy + '%';
        
        // Дополнительные советы
        if (scenario.tips && scenario.tips.length > 0) {
            let tipsHTML = '<ul>';
            scenario.tips.forEach(tip => {
                tipsHTML += `<li>${tip}</li>`;
            });
            tipsHTML += '</ul>';
            extraTips.innerHTML = `<strong>💡 Рекомендации:</strong>${tipsHTML}`;
            extraTips.classList.add('visible');
        } else {
            extraTips.classList.remove('visible');
        }
    }

    /**
     * Добавить запись в историю
     */
    function addToHistory(scenario) {
        const record = {
            icon: scenario.icon,
            title: scenario.title,
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        history.unshift(record);
        
        // Ограничим историю 10 записями
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('voiceHealthHistory', JSON.stringify(history));
        
        renderHistory();
    }

    /**
     * Отрендерить историю
     */
    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<span class="history-empty">Здесь будут отображаться ваши анализы</span>';
            return;
        }
        
        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <span class="history-item-icon">${item.icon}</span>
                <span>${item.title}</span>
                <span class="history-item-time">${item.time}</span>
            </div>
        `).join('');
    }

    /**
     * Сбросить UI в начальное состояние
     */
    function resetUI() {
        resultCard.style.borderColor = 'var(--border)';
        resultCard.style.boxShadow = 'var(--shadow-card)';
        resultIcon.textContent = '🤔';
        resultTitle.textContent = 'Ожидание голоса';
        resultDescription.textContent = 'Нажмите на микрофон и скажите что-нибудь в течение 3 секунд';
        progressFill.style.width = '0%';
        confidenceValue.textContent = '0%';
        extraTips.classList.remove('visible');
    }

    /**
     * Начать запись
     */
    async function startRecording() {
        if (isRecording || isProcessing) return;
        
        try {
            // Запрашиваем доступ к микрофону
            stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });
            
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = handleRecordingStop;
            
            // Начинаем запись
            mediaRecorder.start();
            isRecording = true;
            
            // Обновляем UI
            micButton.classList.add('listening');
            micWrapper.classList.add('listening');
            micHint.textContent = 'Говорите...';
            resetUI();
            
            // Автоостановка через MAX_RECORD_TIME
            recordingTimer = setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, MAX_RECORD_TIME);
            
        } catch (error) {
            console.error('Ошибка доступа к микрофону:', error);
            
            let errorMessage = 'Не удалось получить доступ к микрофону. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Пожалуйста, разрешите доступ в настройках браузера.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'Микрофон не найден на устройстве.';
            } else {
                errorMessage += 'Проверьте подключение микрофона.';
            }
            
            showError(errorMessage);
        }
    }

    /**
     * Остановить запись
     */
    function stopRecording() {
        if (!isRecording) return;
        
        clearTimeout(recordingTimer);
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        // Освобождаем микрофон
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        isRecording = false;
        micButton.classList.remove('listening');
        micWrapper.classList.remove('listening');
    }

    /**
     * Обработка остановки записи
     */
    function handleRecordingStop() {
        isProcessing = true;
        micButton.classList.add('processing');
        micHint.textContent = 'Анализируем...';
        
        // Имитация обработки (1.5-2.5 секунды)
        const processingTime = 1500 + Math.random() * 1000;
        
        setTimeout(() => {
            // Выбираем сценарий
            const scenario = getWeightedRandomScenario();
            
            // Обновляем UI
            updateResultUI(scenario);
            
            // Добавляем в историю
            addToHistory(scenario);
            
            // Сбрасываем состояние
            isProcessing = false;
            micButton.classList.remove('processing');
            micHint.textContent = 'Нажмите и говорите 3 секунды';
            
        }, processingTime);
    }

    /**
     * Показать ошибку
     */
    function showError(message) {
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'Ошибка';
        resultDescription.textContent = message;
        resultCard.style.borderColor = '#ef444470';
        micHint.textContent = 'Попробуйте снова';
    }

    /**
     * Очистить историю
     */
    function clearHistory() {
        if (confirm('Очистить всю историю анализов?')) {
            history = [];
            localStorage.removeItem('voiceHealthHistory');
            renderHistory();
        }
    }

    // ==================== Обработчики событий ====================

    // Клик по кнопке микрофона
    micButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    });

    // Обработка touch событий для мобильных (предотвращаем двойное срабатывание)
    micButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    }, { passive: false });

    // Долгое нажатие на историю для очистки
    historyList.addEventListener('dblclick', (e) => {
        if (history.length > 0) {
            clearHistory();
        }
    });

    // Инициализация при загрузке
    function init() {
        renderHistory();
        resetUI();
        
        // Проверяем поддержку микрофона
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Ваш браузер не поддерживает запись аудио. Попробуйте современный браузер.');
            micButton.style.pointerEvents = 'none';
            micButton.style.opacity = '0.5';
        }
        
        console.log('Voice Health App инициализирован (v1.0.0)');
        console.log('⚠️ Это развлекательное приложение. Не медицинский прибор.');
    }

    // Запуск
    init();

})();
