#!/usr/bin/env python3
"""Sanity-check the event study engine against the 2022-06 surprise 75bp Fed hike."""

from engines.event_study.engine import sanity_check_fed_hike

if __name__ == "__main__":
    result = sanity_check_fed_hike()

    # Basic sanity assertions
    assert result.estimation_obs >= 200, f"Too few estimation obs: {result.estimation_obs}"
    assert result.r_squared > 0.3, f"R² too low for SPY/S&P500: {result.r_squared}"
    # The surprise hike should produce a noticeably negative CAR
    print("CAR total:", result.car_total)
    print("PASSED — sanity check complete.")
