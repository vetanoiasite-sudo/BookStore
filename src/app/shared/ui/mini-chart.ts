import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** One column of the chart. */
export interface ChartPoint {
  /** The label under the column, already formatted. */
  label: string;

  /** What the column is worth. */
  value: number;

  /** The full description a reader gets on hover. */
  title: string;
}

/** A column as the SVG draws it. */
interface Bar extends ChartPoint {
  x: number;
  y: number;
  height: number;
}

/** The drawing area. Fixed, because the SVG scales itself to whatever box it is in. */
const WIDTH = 100;
const HEIGHT = 40;
const GAP = 1.5;

/**
 * A small bar chart drawn as inline SVG.
 *
 * Inline rather than from a charting library: this draws one series of a dozen
 * numbers, and a library that can draw everything would be a large dependency, a
 * second theming system and a second set of accessibility behaviour to keep in step
 * with the rest of the interface.
 *
 * The numbers are also given as a table for anyone who cannot see the drawing, which
 * is the part a picture on its own always leaves out.
 */
@Component({
  selector: 'ui-mini-chart',
  imports: [TranslatePipe],
  templateUrl: './mini-chart.html',
  styleUrl: './mini-chart.scss',
})
export class UiMiniChart {
  readonly points = input.required<ChartPoint[]>();

  /** Translation key naming what the chart shows. */
  readonly label = input.required<string>();

  protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;

  protected readonly peak = computed(() =>
    Math.max(1, ...this.points().map((point) => point.value)),
  );

  protected readonly total = computed(() =>
    this.points().reduce((sum, point) => sum + point.value, 0),
  );

  /**
   * The columns. A day with nothing on it still gets a sliver of a bar, so the axis
   * reads as a row of days rather than as a gap in the data.
   */
  protected readonly bars = computed<Bar[]>(() => {
    const points = this.points();

    if (points.length === 0) {
      return [];
    }

    const slot = WIDTH / points.length;
    const width = Math.max(slot - GAP, 0.5);
    const peak = this.peak();

    return points.map((point, index) => {
      const height = point.value === 0 ? 0.6 : (point.value / peak) * HEIGHT;

      return {
        ...point,
        x: index * slot + (slot - width) / 2,
        y: HEIGHT - height,
        height,
      };
    });
  });

  protected readonly barWidth = computed(() => {
    const count = this.points().length;
    return count === 0 ? 0 : Math.max(WIDTH / count - GAP, 0.5);
  });
}
