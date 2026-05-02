/**
 * Анализатор голоса - Развлекательное приложение
 * Версия: 1.0.0
 */

(function() {
    'use strict';

    // Запрет pull-to-refresh
    document.addEventListener('touchmove', function(e) {
        if (e.target === document.body || e.target === document.documentElement) {
            e.preventDefault();
        }
    }, { passive: false });

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

    // ==================== Состояние ====================
    let mediaRecorder = null;
    let audioChunks = [];
    let stream = null;
    let isRecording = false;
    let isProcessing = false;
    let recordingTimer = null;
    const MAX_RECORD_TIME = 4000;

    // ==================== Сценарии анализа ====================
    const scenarios = [
        {
            id: 'sleep',
            icon: '😴',
            title: 'Вам нужен сон!',
            description: 'Ваш голос звучит уставшим. Тембр понижен, темп речи замедлен. Рекомендуется отдохнуть.',
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
            description: 'В голосе слышна зажатость и монотонность. Похоже, вы засиделись. Разминка поможет взбодриться.',
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
            description: 'Анализ показывает признаки снижения энергии. Рекомендуется полезный перекус.',
            tips: [
                'Фрукты или орехи — отличный выбор',
                'Не забудьте выпить стакан воды',
                'Избегайте сладких снеков'
            ],
            color: '#34d399',
            weight: 25
        },
        {
            id: 'chill',
            icon: '🧘',
            title: 'Вы в отличной форме!',
            description: 'Ваш голос звучит ровно и уверенно. Энергетический баланс в норме.',
            tips: [
                'Поддерживайте водный баланс',
                'Сделайте пятиминутную медитацию',
                'Поделитесь хорошим настроением с близкими'
            ],
            color: '#a78bfa',
            weight: 20
        }
    ];

    // ==================== Функции ====================

    function getWeightedRandomScenario() {
        const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const scenario of scenarios) {
            random -= scenario.weight;
            if (random <= 0) return scenario;
        }
        return scenarios[scenarios.length - 1];
    }

    function getAccuracy() {
        return Math.floor(Math.random() * 25) + 72;
    }

    function updateResultUI(scenario) {
        const accuracy = getAccuracy();
        
        resultCard.style.transition = 'all 0.3s ease';
        resultCard.style.borderColor = scenario.color + '70';
        resultCard.style.boxShadow = `0 12px 30px -8px ${scenario.color}40`;
        
        resultIcon.textContent = scenario.icon;
        resultIcon.style.animation = 'none';
        setTimeout(() => resultIcon.style.animation = 'fadeIn 0.5s ease', 10);
        
        resultTitle.textContent = scenario.title;
        resultDescription.textContent = scenario.description;
        
        progressFill.style.width = accuracy + '%';
        progressFill.style.background = scenario.color;
        confidenceValue.textContent = accuracy + '%';
        
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

    async function startRecording() {
        if (isRecording || isProcessing) return;
        
        try {
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
            
            mediaRecorder.start();
            isRecording = true;
            
            micButton.classList.add('listening');
            micWrapper.classList.add('listening');
            micHint.textContent = 'Говорите...';
            resetUI();
            
            recordingTimer = setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, MAX_RECORD_TIME);
            
        } catch (error) {
            console.error('Ошибка доступа к микрофону:', error);
            
            let errorMessage = 'Не удалось получить доступ к микрофону. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Разрешите доступ в настройках.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'Микрофон не найден.';
            } else {
                errorMessage += 'Проверьте микрофон.';
            }
            
            showError(errorMessage);
        }
    }

    function stopRecording() {
        if (!isRecording) return;
        
        clearTimeout(recordingTimer);
        
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        isRecording = false;
        micButton.classList.remove('listening');
        micWrapper.classList.remove('listening');
    }

    function handleRecordingStop() {
        isProcessing = true;
        micButton.classList.add('processing');
        micHint.textContent = 'Анализируем...';
        
        const processingTime = 1500 + Math.random() * 1000;
        
        setTimeout(() => {
            const scenario = getWeightedRandomScenario();
            updateResultUI(scenario);
            
            isProcessing = false;
            micButton.classList.remove('processing');
            micHint.textContent = 'Нажмите и говорите 3 секунды';
        }, processingTime);
    }

    function showError(message) {
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'Ошибка';
        resultDescription.textContent = message;
        resultCard.style.borderColor = '#ef444470';
        micHint.textContent = 'Попробуйте снова';
    }

    // ==================== Обработчики событий ====================

    micButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    });

    micButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    }, { passive: false });

    function init() {
        resetUI();
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Браузер не поддерживает запись аудио.');
            micButton.style.pointerEvents = 'none';
            micButton.style.opacity = '0.5';
        }
        
        console.log('Анализатор голоса v1.0.0');
    }

    init();

})();
