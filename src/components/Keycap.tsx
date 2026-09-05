type KeycapProps = {
  children: string;
  className?: string;
};

export function Keycap({ children, className = '' }: KeycapProps) {
  return (
    <kbd
      className={`keycap font-mono text-[10px] font-medium tracking-wide ${className}`.trim()}
    >
      {children}
    </kbd>
  );
}
