// Внутреннее состояние физического движка
let state = {
    speed: 0,
    maxSpeed: 70,          
    acceleration: 1.2,     
    brakeForce: 1.8,       
    friction: 0.1,         
    riderLean: 0,          
    gForce: 0,             
    isCrashed: false,
    crashReason: "",
    totalVector: 0
};

let activeKeys = { w: false, s: false, ArrowLeft: false, ArrowRight: false };

// Слушаем команды от основного потока (UI)
self.onmessage = function(e) {
    if (e.data.type === 'KEYS_UPDATE') {
        activeKeys = e.data.keys;
    }
    if (e.data.type === 'RESET') {
        state.speed = 0;
        state.riderLean = 0;
        state.gForce = 0;
        state.isCrashed = false;
        state.crashReason = "";
        state.totalVector = 0;
    }
};

function updatePhysics() {
    if (state.isCrashed) return;

    // 1. Механика наклона тела (управление центром массы)
    if (activeKeys.ArrowLeft) state.riderLean -= 1.5; 
    if (activeKeys.ArrowRight) state.riderLean += 1.5; 
    
    if (!activeKeys.ArrowLeft && !activeKeys.ArrowRight) {
        state.riderLean *= 0.9; 
    }
    state.riderLean = Math.max(-40, Math.min(40, state.riderLean));

    // 2. Расчет динамики мотора и гидравлики тормозов
    if (activeKeys.w) { 
        state.speed += state.acceleration;
        state.gForce += 0.8; // Инерция тянет назад
    }
    if (activeKeys.s) { 
        state.speed -= state.brakeForce;
        state.gForce -= 1.2; // Инерция толкает вперед
    }

    if (!activeKeys.w && !activeKeys.s) {
        if (state.speed > 0) state.speed -= state.friction;
        state.gForce *= 0.8; 
    }

    if (state.speed < 0) state.speed = 0;
    if (state.speed > state.maxSpeed) state.speed = state.maxSpeed;

    // 3. Вычисление результирующего вектора сил G-Force + Lean
    state.totalVector = state.riderLean + (state.gForce * 1.5);

    // Проверка условий падения
    if (state.totalVector > 45 && state.speed > 5) {
        state.isCrashed = true;
        state.crashReason = "ВЫЛЕТ ЧЕРЕЗ РУЛЬ! (При торможении не уперся назад)";
    } else if (state.totalVector < -45 && activeKeys.w) {
        state.isCrashed = true;
        state.crashReason = "САМОКАТ ВЫРВАЛО ИЗ РУК! (Резкий газ без наклона вперед)";
    }
}

// Фиксированный цикл обновления физики (~60 раз в секунду)
setInterval(() => {
    updatePhysics();
    // Отправляем обновленный стейт обратно в главный поток для отрисовки
    self.postMessage(state);
}, 1000 / 60);
