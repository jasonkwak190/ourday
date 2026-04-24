'use client';

export default function Icon({ name, size = 22, color = 'currentColor', className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      style={{ color, flexShrink: 0, ...style }}
      className={className}
      aria-hidden="true"
    >
      <use href={`/icons.svg#${name}`} />
    </svg>
  );
}
