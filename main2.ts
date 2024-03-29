
// --- Settings ---
let irDiodePin = AnalogPin.P0
let irReceiverPin = DigitalPin.P2
let signalPartTolerance = 50
// ---

let signals: number[][] = [];
let currentSignal: number[] = [];
let receivedSignal: number[] = [];

pins.analogWritePin(irDiodePin, 0);
pins.analogSetPeriod(irDiodePin, 26);

function enableIrMarkSpaceDetection(irDiodePin: DigitalPin) {
    pins.setPull(irDiodePin, PinPullMode.PullNone);

    let mark = 0;
    let space = 0;

    pins.onPulsed(irDiodePin, PulseValue.Low, () => {
        mark = pins.pulseDuration();
        receivedSignal.push(mark)
    });

    pins.onPulsed(irDiodePin, PulseValue.High, () => {
        space = pins.pulseDuration();
        if (space > 100000){
            receivedSignal = []
        } else {
            receivedSignal.push(space)
        }
    });
}

enableIrMarkSpaceDetection(irReceiverPin)

input.onButtonPressed(Button.AB, function () {
    // Show stored signals.
    serial.writeString("Recorded signals:\n")

    for (let i = 0; i < signals.length; i++) {
        serial.writeString(i + "\n")
        serial.writeNumbers(signals[i])
    }

    // Send stored signals.
    for (let signal of signals){
        send(signal)
        basic.pause(1000)
    }
})

// Send the last received signal.
input.onButtonPressed(Button.A, function () {
    send(currentSignal)
})

// Store the last received signal.
input.onButtonPressed(Button.B, function() {
    signals.push(currentSignal)
})

function send(signal: number[]){
    let isHight = false;
    for (let time of signal) {
        if (isHight) {
            pins.analogWritePin(irDiodePin, 1);
        } else {
            pins.analogWritePin(irDiodePin, 511);
        }

        control.waitMicros(time);
        isHight = !isHight
    }
    pins.analogWritePin(irDiodePin, 0);
}

// --- Processing the last received signal. ---
let lastReceivedSignalKey = '';
let signalCounter = 0;

basic.forever(() => {
    if (receivedSignal.length){
        let receivedSignalKey = receivedSignal.join('_')
        if (lastReceivedSignalKey != receivedSignalKey){
            lastReceivedSignalKey = receivedSignalKey
        } else {
            currentSignal = JSON.parse(JSON.stringify(receivedSignal))


            lastReceivedSignalKey = ''
            control.runInBackground(() => {
                processSignal(signals, currentSignal)
            })
            receivedSignal = []

            // Debug
            // serial.writeString('\n> ' + signalCounter + '\n')
            // signalCounter++
            // serial.writeNumbers(currentSignal)
        }

    }
})

// Checks if the current signal matches a stored signal.

function processSignal(patterns: number[][], signal: number[]){
    if (!signal.length){
        return false;
    }
    
    for (let i = 0; i < patterns.length; i++) {
        let pattern = patterns[i]
        if (!pattern.length){
            continue
        }

        let test = true;
        for (let n = 0; n < pattern.length; n++){
            if (signal[n] > pattern[n] + signalPartTolerance || signal[n] < pattern[n] - signalPartTolerance){
                test = false;
                break;
            }
        }

        if (test){
            runOnSignal(i)
            return true
        } else {
            continue;
        }
    }

    return false
}

// Runs the command when the recorded signal appears.

function runOnSignal(signalId: number){
    // basic.showNumber(signalId)

    if (signalId == 0){
        led.plot(2,2)
    } else if (signalId == 1) {
        basic.showIcon(IconNames.Heart)
    } else if (signalId == 2) {
        basic.showIcon(IconNames.House)
    }

    basic.pause(500)
    basic.clearScreen()
}