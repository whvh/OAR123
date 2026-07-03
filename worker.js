let state = {
    scooterAngle: 0.3,     // Начинаем сразу с небольшого подъема, так как газа для подрыва нет
    angularVelocity: 0,    
    riderLean: 0,          // Смещение свисающей ноги и корпуса
    stuntTime: 0,          
    isCrashed: false,
    crashReason: ""
};

let activeKeys = { ArrowLeft: false, ArrowRight: false };

self.onmessage = function(e) {
    if (e.data.type === 'KEYS_UPDATE') activeKeys = e.data.keys;
    if (e.data.type === 'RESET') {
        state.scooterAngle = 0.3; // Сброс в исходную приподнятую позицию
        state.angularVelocity = 0;
        state.riderLean = 0;
        state.stuntTime = 0;
        state.isCrashed = false;
        state.crashReason = "";
    }
};

function updatePureBalancePhysics() {
    if (state.isCrashed) return;

    // 1. Изменение положения тела (Райдер 70 кг)
    if (activeKeys.ArrowLeft) {
        state.riderLean -= 0.8;  // Отводим ногу назад, вывешивая массу за ось
    }
    if (activeKeys.ArrowRight) {
        state.riderLean += 0.8;  // Смещаем массу обратно к рулю
    }
    
    // Плавный возврат тела, если кнопки не зажаты
    if (!activeKeys.ArrowLeft && !activeKeys.ArrowRight) {
        state.riderLean *= 0.92; 
    }
    state.riderLean = Math.max(-35, Math.min(35, state.riderLean));

    // 2. Силы тяжести и противовеса
    let torque = 0;

    // Массивный KuKirin Тянет деку вперед вниз к земле
    torque -= 0.0045 * Math.cos(state.scooterAngle);

    // Момент силы от смещения тела и свисающей ноги.
    // Отрицательный riderLean (наклон назад) создает положительный крутящий момент, поднимающий самокат вверх.
    torque -= (state.riderLean * 0.00019);

    // 3. Физика вращения рамы
    state.angularVelocity += torque;
    state.angularVelocity *= 0.96; // Высокое затухание для точного контроля
    state.scooterAngle += state.angularVelocity;

    // Начисление времени балансирования
    if (state.scooterAngle > 0.05) {
        state.stuntTime += 1000 / 60;
    }

    // 4. Критерии падения
    // Упал вперед (Переднее колесо коснулось земли)
    if (state.scooterAngle <= 0) {
        state.scooterAngle = 0;
        state.isCrashed = true;
        state.crashReason = "ПРОИГРЫШ: Не удержал баланс и упал вперед на переднее колесо!";
        state.angularVelocity = 0;
    }

    // Опрокидывание назад через спину (Точка невозврата)
    if (state.scooterAngle > 1.2) { 
        state.isCrashed = true;
        state.crashReason = "ПРОИГРЫШ: Перевесил корпусом назад и перевернулся!";
    }

    // Свисающая нога коснулась земли слишком рано
    if (state.riderLean < -28 && state.scooterAngle > 0.25) {
        state.isCrashed = true;
        state.crashReason = "ПРОИГРЫШ: Свисающая нога зацепила асфальт. Баланс потерян!";
    }
}

setInterval(() => {
    updatePureBalancePhysics();
    self.postMessage(state);
}, 1000 / 60);
