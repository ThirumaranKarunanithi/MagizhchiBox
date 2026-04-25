import { Capacitor } from '@capacitor/core'

/** True when running inside a Capacitor native app (Android / iOS). */
export const isNative = Capacitor.isNativePlatform()
