---------------------------- MODULE LatestQuery ----------------------------
EXTENDS Naturals, FiniteSets

CONSTANTS MaxRequests, ProtectLatest
VARIABLES issued, version, pending, status, shown, staleWrite

vars == <<issued, version, pending, status, shown, staleWrite>>

Init ==
    /\ issued = 0
    /\ version = 0
    /\ pending = {}
    /\ status = "idle"
    /\ shown = 0
    /\ staleWrite = FALSE

Start ==
    /\ issued < MaxRequests
    /\ issued' = issued + 1
    /\ version' = issued + 1
    /\ pending' = pending \cup {issued + 1}
    /\ status' = "loading"
    /\ UNCHANGED <<shown, staleWrite>>

Finish(request, outcome) ==
    /\ request \in pending
    /\ pending' = pending \ {request}
    /\ IF ~ProtectLatest \/ request = version
          THEN /\ status' = outcome
               /\ shown' = IF outcome = "success" THEN request ELSE shown
               /\ staleWrite' = (staleWrite \/ request # version)
          ELSE UNCHANGED <<status, shown, staleWrite>>
    /\ UNCHANGED <<issued, version>>

Next == Start \/
    (\E request \in pending : \E outcome \in {"success", "error"} : Finish(request, outcome))

TypeOK ==
    /\ issued \in 0..MaxRequests
    /\ version \in 0..(MaxRequests + 1)
    /\ pending \subseteq 1..issued
    /\ status \in {"idle", "loading", "success", "error"}
    /\ shown \in 0..issued
    /\ staleWrite \in BOOLEAN

NoStaleCompletion == ~staleWrite

Spec == Init /\ [][Next]_vars
=============================================================================
