// Физическая модель: KuKirin G4 (37кг) + Райдер в стант-стойке (70кг)
let state = {
    scooterAngle: 0,       // Угол наклона в радианах
    angularVelocity: 0,    // Угловая скорость вращения вокруг задней оси
    riderLean: 0,          // Смещение веса тела (минус - назад за бугель, плюс - на руль)
    motorTorqueCurrent: 0, // Фазовый ток мотора (крутящий момент)
    isCrashed: false,
    crashReason: ""
};

let activeKeys = { w: false, s: false, ArrowLeft: false, ArrowRight: false };

// Профиль SPORT-контроллера KuKirin G4 (резкий подрыв и умеренная фазовая инерция)
const sportProfile = {
    rampUp: 0.0035,     // Нарастание тока при нажатии газа
    maxTorque: 0.0125,   // Пиковый крутящий момент мотора 2000W
    decay: 0.65         // Скорость затухания магнитного поля при отпуске газа
};

self.onmessage = function(e) {
    if (e.data.type === 'KEYS_UPDATE') activeKeys = e.data.keys;
    if (e.data.type === 'RESET') {
        state.scooterAngle = 0;
        state.angularVelocity = 0;
        state.riderLean = 0;
        state.motorTorqueCurrent = 0;
        state.isCrashed = false;
        state.crashReason = "";
    }
};

function updateWheeliePhysics() {
    if (state.isCrashed) return;

    // 1. Механика распределения веса тела (70кг)
    if (activeKeys.ArrowLeft) state.riderLean -= 1.4;  // Уход за бугель
    if (activeKeys.ArrowRight) state.riderLean += 1.4; // Упор в руль
    if (!activeKeys.ArrowLeft && !activeKeys.ArrowRight) state.riderLean *= 0.85; 
    state.riderLean = Math.max(-35, Math.min(35, state.riderLean));

    // 2. Баланс сил и моментов (Torque)
    let torque = 0;

    // Гравитационный момент тяжелой конструкции (Тянет самокат вниз к земле)
    torque -= 0.0055 * Math.cos(state.scooterAngle);

    // Работа 2000W мотора (Кнопка W)
    if (activeKeys.w) {
        state.motorTorqueCurrent += sportProfile.rampUp; 
        if (state.motorTorqueCurrent > sportProfile.maxTorque) {
            state.motorTorqueCurrent = sportProfile.maxTorque;
        }
    } else {
        // Микро-инерция двигателя (фазы обмоток затухают плавно)
        state.motorTorqueCurrent *= sportProfile.decay; 
    }
    torque += state.motorTorqueCurrent;

    // Задняя гидравлика тормозов (Кнопка S)
    if (activeKeys.s) {
        if (state.scooterAngle > 0) {
            torque -= 0.018; // Тормозной момент превышает крутящий момент мотора
            state.motorTorqueCurrent = 0; // Аппаратная отсечка газа тормозом
        }
    }

    // Влияние рычага веса пилота на бугель
    torque -= (state.riderLean * 0.00022);

    // 3. Вычисление итогового вектора движения
    state.angularVelocity += torque;
    state.angularVelocity *= 0.95; // Сопротивление и потери энергии
    state.scooterAngle += state.angularVelocity;

    // 4. Логика поражений (Crash Conditions)
    // Жесткое падение вперед на переднее колесо
    if (state.scooterAngle <= 0) {
        state.scooterAngle = 0;
        if (state.angularVelocity < -0.018) {
            state.isCrashed = true;
            state.crashReason = "ПРОИГРЫШ: Крэш передней вилки! Слишком резко прожал тормоз или бросил газ.";
        }
        state.angularVelocity = 0;
    }

    // Опрокидывание назад через спину
    if (state.scooterAngle > 1.3) { // ~75 градусов
        state.isCrashed = true;
        state.crashReason = "ПРОИГРЫШ: Перевернулся назад! В режиме SPORT мотор выдал пик, а тормоз не нажат вовремя.";
    }

    // Срыв с заднего упора
    if (state.riderLean < -30 && state.scooterAngle > 0.35) {
        state.isCrashed = true;
        state.crashReason = "ПРОИГРЫШ: Упал с бугеля! Слишком рано отклонился назад, потеряв баланс.";
    }
}

setInterval(() => {
    updateWheeliePhysics();
    self.postMessage(state);
}, 1000 / 60);
