import { HearthHistogram, type HearthHistogramDatum } from './component';

const weights = [
  812, 798, 826, 804, 790, 835, 818, 809, 776, 821, 842, 803, 815, 797, 828,
  811, 784, 819, 806, 833, 801, 816, 795, 824, 858, 807, 813, 789, 822, 810,
];

const data: HearthHistogramDatum[] = weights.map((value, index) => ({
  id: `loaf-${index + 1}`,
  value,
}));

export function Example({ animate = true }: { animate?: boolean }) {
  return (
    <HearthHistogram
      data={data}
      binWidth={10}
      binStart={770}
      unitLabel="A month of loaves"
      contextLabel="Finished weight, grams"
      countLabel="loaves"
      valueFormatter={(value) => `${value} g`}
      aria-label="Illustrative finished weights of thirty loaves"
      animate={animate}
    />
  );
}
