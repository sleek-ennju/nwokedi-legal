/**
 * The admin's icon set: one family, 20px grid, 1.6 stroke, round joins.
 * Authored here so every icon matches (no mixed libraries, no glyphs).
 */
const PATHS = {
  overview: "M3.5 4.5h5.5v6.5H3.5zM11 4.5h5.5v3.5H11zM11 10h5.5v5.5H11zM3.5 13h5.5v2.5H3.5z",
  orders: "M5 2.75h10v14.5l-2.5-1.5-2.5 1.5-2.5-1.5L5 17.25zM7.75 6.75h4.5M7.75 9.75h4.5M7.75 12.75h2.5",
  books: "M4.25 4.25c0-.83.67-1.5 1.5-1.5h9.5v12.5h-9.5c-.83 0-1.5.67-1.5 1.5zM4.25 16.75c0-.83.67-1.5 1.5-1.5h9.5M8 6.5h4",
  articles: "M5 3.25h7.5l3 3V16.75H5zM12.25 3.25v3.25h3.25M7.75 9.5h5M7.75 12.25h5M7.75 15h3",
  analytics: "M3.25 16.25h13.5M5.5 13.25V9.5M9.25 13.25v-7M13 13.25v-4.5M16.25 4.25 13 7.25 9.25 4.75 5.5 7.25",
  customers: "M7.5 9.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.75 16.25c.5-2.6 2.4-4.25 4.75-4.25s4.25 1.65 4.75 4.25M13 4c1.3.25 2.25 1.4 2.25 2.75S14.3 9.25 13 9.5M14.25 12.25c1.6.45 2.65 1.9 3 4",
  enquiries: "M3.25 5.25c0-.83.67-1.5 1.5-1.5h10.5c.83 0 1.5.67 1.5 1.5v7.5c0 .83-.67 1.5-1.5 1.5H9l-3.75 2.5v-2.5h-.5c-.83 0-1.5-.67-1.5-1.5zM6.75 7.75h6.5M6.75 10.25h4",
  settings: "M3.25 6h7.5M14.25 6h2.5M3.25 14h2.5M9.25 14h7.5M12.5 7.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM7.5 15.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z",
  external: "M11.25 3.75h5v5M16.25 3.75 9.5 10.5M14.25 11.75v3.5c0 .55-.45 1-1 1h-8.5c-.55 0-1-.45-1-1v-8.5c0-.55.45-1 1-1h3.5",
  signout: "M8 16.25H5c-.69 0-1.25-.56-1.25-1.25V5c0-.69.56-1.25 1.25-1.25h3M12.5 13.25 15.75 10 12.5 6.75M15.75 10h-8",
} as const;

export type IconName = keyof typeof PATHS;

export default function AdminIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="a-ico"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
