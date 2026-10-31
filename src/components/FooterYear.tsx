"use client";

import { useEffect, useState } from "react";

export function FooterYear() {
  const [year, setYear] = useState<number>(2025);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <span>{year}</span>;
}

