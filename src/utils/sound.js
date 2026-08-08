let audioContext

export function playTaskCompleteSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      return
    }

    audioContext = audioContext || new AudioContextClass()
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const notes = [523.25, 659.25, 783.99, 1046.5]
    const now = audioContext.currentTime

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      const startAt = now + index * 0.08

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.35)

      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start(startAt)
      oscillator.stop(startAt + 0.4)
    })
  } catch {
    // Sound is a progressive enhancement; the UI still works without audio.
  }
}
