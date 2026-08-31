"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LicenseStatus } from "@/lib/licenses/types";
import { loadLicenseIndicatorStatus } from "./license-indicator-utils";
import { LICENSE_STATUS_CHANGED_EVENT } from "@/lib/licenses/constants";

export function LicenseIndicator() {
	return null;
}
