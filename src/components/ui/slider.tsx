"use client"

/**
 * SHIM — Slider del mvp = Slider/RangeSlider de @leasefy/cadence.
 * Sin call sites en el mvp (0 imports), así que la API extendida legacy
 * (variant/size/label/marks/showValue) se retira sin impacto.
 */
import type * as React from "react"
import { Slider } from "@leasefy/cadence"

export { Slider, RangeSlider } from "@leasefy/cadence"
export type { RangeSliderProps } from "@leasefy/cadence"
export type SliderProps = React.ComponentPropsWithoutRef<typeof Slider>
