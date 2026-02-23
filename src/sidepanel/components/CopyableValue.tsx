import React, { useState, useCallback } from "react";

interface Props {
  value: string;
  children: React.ReactNode;
}

export function CopyableValue({ value, children }: Props) {
  const [showToast, setShowToast] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(value).then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1500);
      });
    },
    [value]
  );

  return (
    <>
      <span className="copyable" onClick={handleClick} title="クリックでコピー">
        {children}
      </span>
      {showToast && <div className="copy-toast">コピーしました: {value}</div>}
    </>
  );
}
