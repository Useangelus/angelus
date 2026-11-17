// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BellRegistry} from "../src/BellRegistry.sol";

contract BellRegistryTest is Test {
    BellRegistry reg;
    address owner = makeAddr("owner");
    address keeper = makeAddr("keeper");
    address stranger = makeAddr("stranger");

    uint32 constant SESSION = 20261117; // Tue, Nov 17 2026
    uint256 constant DAY = 1794873600; // 2026-11-17 00:00 UTC

    event BellSealed(uint32 indexed session, bytes32 digest, bytes8[] tickers, uint64[] closes, uint64[] bells);

    function setUp() public {
        reg = new BellRegistry(owner, keeper);
    }

    // ------------------------------------------------------------ helpers

    function _data() internal pure returns (bytes8[] memory t, uint64[] memory c, uint64[] memory b) {
        t = new bytes8[](3);
        c = new uint64[](3);
        b = new uint64[](3);
        t[0] = bytes8("AAPL");
        t[1] = bytes8("NVDA");
        t[2] = bytes8("TSLA");
        c[0] = 352_780000;
        c[1] = 156_140000;
        c[2] = 379_740000;
        b[0] = 353_290000;
        b[1] = 155_110000;
        b[2] = 377_060000;
    }

    function _sealAt(uint32 session, uint256 ts) internal returns (bytes32) {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(ts);
        vm.prank(keeper);
        return reg.seal(session, t, c, b);
    }

    // ------------------------------------------------------------ dates

    function test_dayStartOf_knownDates() public view {
        assertEq(reg.dayStartOf(20000101), 946684800);
        assertEq(reg.dayStartOf(20240101), 1704067200);
        assertEq(reg.dayStartOf(20240229), 1709164800);
        assertEq(reg.dayStartOf(SESSION), DAY);
        assertEq(reg.dayStartOf(21991231), 7258032000);
    }

    function test_dayStartOf_rejectsImpossibleDates() public {
        uint32[8] memory bad = [uint32(20230229), 20261131, 20260001, 20261300, 20261100, 19991231, 22000101, 20210431];
        for (uint256 i; i < bad.length; ++i) {
            vm.expectRevert(BellRegistry.BadDate.selector);
            reg.dayStartOf(bad[i]);
        }
    }

    function testFuzz_dayStartOf_consecutiveDays(uint256 offset) public view {
        // Walk from 2000-01-01 by whole days and check every date the contract computes is exactly one day apart.
        offset = bound(offset, 0, 72000);
        uint256 ts = 946684800 + offset * 1 days;
        (uint256 y, uint256 m, uint256 d) = _civil(ts / 1 days);
        uint32 ymd = uint32(y * 10000 + m * 100 + d);
        assertEq(reg.dayStartOf(ymd), ts);
    }

    // ------------------------------------------------------------ sealing

    function test_seal_storesDigestAndEmits() public {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        bytes32 expected = keccak256(abi.encode(SESSION, t, c, b));
        vm.warp(DAY + 9 hours);
        vm.expectEmit(true, false, false, true, address(reg));
        emit BellSealed(SESSION, expected, t, c, b);
        vm.prank(keeper);
        bytes32 got = reg.seal(SESSION, t, c, b);

        assertEq(got, expected);
        BellRegistry.Seal memory s = reg.sealOf(SESSION);
        assertEq(s.digest, expected);
        assertEq(s.sealedAt, DAY + 9 hours);
        assertEq(s.count, 3);
        assertEq(reg.lastSession(), SESSION);
        assertTrue(reg.verify(SESSION, t, c, b));
    }

    function test_verify_rejectsAnyChangedNumber() public {
        _sealAt(SESSION, DAY + 8 hours);
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        b[1] += 1; // one micro-dollar on one stock
        assertFalse(reg.verify(SESSION, t, c, b));
        assertFalse(reg.verify(SESSION + 1, t, c, b));
    }

    function test_seal_onlyKeeper() public {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY + 8 hours);
        vm.prank(stranger);
        vm.expectRevert(BellRegistry.NotKeeper.selector);
        reg.seal(SESSION, t, c, b);
        vm.prank(owner); // the owner cannot seal either
        vm.expectRevert(BellRegistry.NotKeeper.selector);
        reg.seal(SESSION, t, c, b);
    }

    function test_seal_refusedAtAndAfterTheDeadline() public {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY + 13 hours + 30 minutes);
        vm.prank(keeper);
        vm.expectRevert(BellRegistry.TooLate.selector);
        reg.seal(SESSION, t, c, b);

        vm.warp(DAY + 13 hours + 30 minutes - 1);
        vm.prank(keeper);
        reg.seal(SESSION, t, c, b);
    }

    function test_seal_refusedBeforeTheDayStarts() public {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY - 1);
        vm.prank(keeper);
        vm.expectRevert(BellRegistry.TooEarly.selector);
        reg.seal(SESSION, t, c, b);
    }

    function test_seal_cannotBackfillAPastSession() public {
        // Once Nov 17 is sealed, nothing can be written for Nov 16 or earlier, even inside its own window.
        _sealAt(SESSION, DAY + 8 hours);
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY - 1 days + 8 hours);
        vm.prank(keeper);
        vm.expectRevert(BellRegistry.NotNewer.selector);
        reg.seal(20261116, t, c, b);
    }

    function test_seal_onceOnly() public {
        bytes32 first = _sealAt(SESSION, DAY + 8 hours);
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        b[0] = 1;
        vm.prank(keeper);
        vm.expectRevert(BellRegistry.NotNewer.selector);
        reg.seal(SESSION, t, c, b);
        assertEq(reg.sealOf(SESSION).digest, first);
    }

    function test_seal_nextDayWorks() public {
        _sealAt(SESSION, DAY + 8 hours);
        _sealAt(20261118, DAY + 1 days + 9 hours);
        assertEq(reg.lastSession(), 20261118);
    }

    function test_seal_rejectsBadLengths() public {
        vm.warp(DAY + 8 hours);
        vm.startPrank(keeper);
        vm.expectRevert(BellRegistry.BadLength.selector);
        reg.seal(SESSION, new bytes8[](0), new uint64[](0), new uint64[](0));
        vm.expectRevert(BellRegistry.BadLength.selector);
        reg.seal(SESSION, new bytes8[](2), new uint64[](1), new uint64[](2));
        vm.expectRevert(BellRegistry.BadLength.selector);
        reg.seal(SESSION, new bytes8[](65), new uint64[](65), new uint64[](65));
        vm.stopPrank();
    }

    function test_seal_rejectsUnsortedDuplicateOrEmptyTickers() public {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY + 8 hours);
        vm.startPrank(keeper);

        (t[0], t[1]) = (t[1], t[0]);
        vm.expectRevert(abi.encodeWithSelector(BellRegistry.BadTicker.selector, 1));
        reg.seal(SESSION, t, c, b);

        (t,,) = _data();
        t[2] = t[1];
        vm.expectRevert(abi.encodeWithSelector(BellRegistry.BadTicker.selector, 2));
        reg.seal(SESSION, t, c, b);

        (t,,) = _data();
        t[0] = bytes8(0);
        vm.expectRevert(abi.encodeWithSelector(BellRegistry.BadTicker.selector, 0));
        reg.seal(SESSION, t, c, b);
        vm.stopPrank();
    }

    function test_seal_rejectsZeroPrices() public {
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY + 8 hours);
        vm.startPrank(keeper);
        c[1] = 0;
        vm.expectRevert(abi.encodeWithSelector(BellRegistry.BadPrice.selector, 1));
        reg.seal(SESSION, t, c, b);
        (, c, b) = _data();
        b[2] = 0;
        vm.expectRevert(abi.encodeWithSelector(BellRegistry.BadPrice.selector, 2));
        reg.seal(SESSION, t, c, b);
        vm.stopPrank();
    }

    function test_seal_sixteenStocksFitsComfortably() public {
        bytes8[] memory t = new bytes8[](16);
        uint64[] memory c = new uint64[](16);
        uint64[] memory b = new uint64[](16);
        for (uint256 i; i < 16; ++i) {
            t[i] = bytes8(uint64(0x4100000000000000) + uint64(i)); // ascending
            c[i] = uint64(100_000000 + i);
            b[i] = uint64(101_000000 + i);
        }
        vm.warp(DAY + 8 hours);
        vm.prank(keeper);
        uint256 g = gasleft();
        reg.seal(SESSION, t, c, b);
        uint256 used = g - gasleft();
        emit log_named_uint("gas for 16 stocks", used);
        assertLt(used, 200_000);
    }

    function testFuzz_seal_anyMomentInsideTheWindow(uint256 secs) public {
        secs = bound(secs, 0, 13 hours + 30 minutes - 1);
        _sealAt(SESSION, DAY + secs);
        assertEq(reg.lastSession(), SESSION);
    }

    function testFuzz_seal_neverAfterTheWindow(uint256 secs) public {
        secs = bound(secs, 13 hours + 30 minutes, 400 days);
        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY + secs);
        vm.prank(keeper);
        vm.expectRevert(BellRegistry.TooLate.selector);
        reg.seal(SESSION, t, c, b);
    }

    // ------------------------------------------------------------ admin

    function test_setKeeper_rotates() public {
        address next = makeAddr("next");
        vm.prank(stranger);
        vm.expectRevert(BellRegistry.NotOwner.selector);
        reg.setKeeper(next);

        vm.prank(owner);
        vm.expectRevert(BellRegistry.ZeroAddress.selector);
        reg.setKeeper(address(0));

        vm.prank(owner);
        reg.setKeeper(next);
        assertEq(reg.keeper(), next);

        (bytes8[] memory t, uint64[] memory c, uint64[] memory b) = _data();
        vm.warp(DAY + 8 hours);
        vm.prank(keeper);
        vm.expectRevert(BellRegistry.NotKeeper.selector);
        reg.seal(SESSION, t, c, b);
        vm.prank(next);
        reg.seal(SESSION, t, c, b);
    }

    function test_ownership_twoStep() public {
        address next = makeAddr("nextOwner");
        vm.prank(stranger);
        vm.expectRevert(BellRegistry.NotOwner.selector);
        reg.transferOwnership(next);

        vm.prank(owner);
        reg.transferOwnership(next);
        assertEq(reg.owner(), owner); // nothing changes until accepted

        vm.prank(stranger);
        vm.expectRevert(BellRegistry.NotPendingOwner.selector);
        reg.acceptOwnership();

        vm.prank(next);
        reg.acceptOwnership();
        assertEq(reg.owner(), next);
        assertEq(reg.pendingOwner(), address(0));
    }

    function test_constructor_rejectsZero() public {
        vm.expectRevert(BellRegistry.ZeroAddress.selector);
        new BellRegistry(address(0), keeper);
        vm.expectRevert(BellRegistry.ZeroAddress.selector);
        new BellRegistry(owner, address(0));
    }

    function test_holdsNoFunds() public {
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        (bool ok,) = address(reg).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(address(reg).balance, 0);
    }

    // ------------------------------------------------------------ reference civil-from-days

    function _civil(uint256 z) internal pure returns (uint256 y, uint256 m, uint256 d) {
        z += 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        d = doy - (153 * mp + 2) / 5 + 1;
        m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y += 1;
    }
}
