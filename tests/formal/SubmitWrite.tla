---------------------------- MODULE SubmitWrite ----------------------------
EXTENDS Naturals, FiniteSets

CONSTANTS MaxAttempts, MaxWrites, AllowUnknownRetry
VARIABLES attempt, status, requests, results, closed, bodyFailed, unknownBaseline, successThenReject, failureResults

AttemptIDs == 1..MaxAttempts
WriteIDs == 1..MaxWrites
Outcomes == {"not_sent", "running", "ok", "rejected", "unknown"}
Statuses == {"idle", "loading", "success", "error", "unknown"}
vars == <<attempt, status, requests, results, closed, bodyFailed, unknownBaseline, successThenReject, failureResults>>

Sent == Cardinality({pair \in AttemptIDs \X WriteIDs : requests[pair[1]][pair[2]] # "not_sent"})
Pending == {write \in WriteIDs : requests[attempt][write] = "running"}
HasPossibleWrite == \E write \in WriteIDs : requests[attempt][write] \in {"ok", "unknown"}
CompletionFailed == bodyFailed \/ (\E write \in WriteIDs : requests[attempt][write] = "unknown")
FinalStatus == IF CompletionFailed THEN IF HasPossibleWrite THEN "unknown" ELSE "error" ELSE "success"

Init ==
    /\ attempt = 0
    /\ status = "idle"
    /\ requests = [a \in AttemptIDs |-> [w \in WriteIDs |-> "not_sent"]]
    /\ results = [a \in AttemptIDs |-> "none"]
    /\ closed = TRUE
    /\ bodyFailed = FALSE
    /\ unknownBaseline = 0
    /\ successThenReject = [a \in AttemptIDs |-> FALSE]
    /\ failureResults = [a \in AttemptIDs |-> FALSE]

Start ==
    /\ attempt < MaxAttempts
    /\ status # "loading"
    /\ (status # "unknown" \/ AllowUnknownRetry)
    /\ attempt' = attempt + 1
    /\ status' = "loading"
    /\ closed' = FALSE
    /\ bodyFailed' = FALSE
    /\ UNCHANGED <<requests, results, unknownBaseline, successThenReject, failureResults>>

Send(write) ==
    /\ status = "loading"
    /\ ~closed
    /\ requests[attempt][write] = "not_sent"
    /\ \A earlier \in 1..(write - 1) : requests[attempt][earlier] # "not_sent"
    /\ requests' = [requests EXCEPT ![attempt][write] = "running"]
    /\ UNCHANGED <<attempt, status, results, closed, bodyFailed, unknownBaseline, successThenReject, failureResults>>

Resolve(write, outcome) ==
    /\ status = "loading"
    /\ requests[attempt][write] = "running"
    /\ requests' = [requests EXCEPT ![attempt][write] = outcome]
    /\ UNCHANGED <<attempt, status, results, unknownBaseline, bodyFailed, closed, failureResults>>
    /\ successThenReject' = [successThenReject EXCEPT ![attempt] = (@ \/ (write = 2 /\ outcome = "rejected" /\ requests[attempt][1] = "ok"))]

Close(failed) ==
    /\ status = "loading"
    /\ ~closed
    /\ closed' = TRUE
    /\ bodyFailed' = (bodyFailed \/ failed)
    /\ UNCHANGED <<attempt, status, requests, results, unknownBaseline, successThenReject, failureResults>>

Finish ==
    /\ status = "loading"
    /\ closed
    /\ Pending = {}
    /\ status' = FinalStatus
    /\ results' = [results EXCEPT ![attempt] = FinalStatus]
    /\ unknownBaseline' = IF FinalStatus = "unknown" /\ unknownBaseline = 0 THEN Sent ELSE unknownBaseline
    /\ failureResults' = [failureResults EXCEPT ![attempt] = CompletionFailed]
    /\ UNCHANGED <<attempt, requests, closed, bodyFailed, successThenReject>>

Next == Start \/ Finish \/
    (\E write \in WriteIDs : Send(write)) \/
    (\E write \in WriteIDs : \E outcome \in {"ok", "rejected", "unknown"} : Resolve(write, outcome)) \/
    (\E failed \in BOOLEAN : Close(failed))

TypeOK ==
    /\ attempt \in 0..MaxAttempts
    /\ status \in Statuses
    /\ requests \in [AttemptIDs -> [WriteIDs -> Outcomes]]
    /\ results \in [AttemptIDs -> ({"none"} \cup Statuses)]
    /\ closed \in BOOLEAN
    /\ bodyFailed \in BOOLEAN
    /\ unknownBaseline \in 0..(MaxAttempts * MaxWrites)
    /\ successThenReject \in [AttemptIDs -> BOOLEAN]
    /\ failureResults \in [AttemptIDs -> BOOLEAN]

NoUnknownResend == unknownBaseline = 0 \/ Sent = unknownBaseline

PendingStaysLoading ==
    \A a \in AttemptIDs :
        (\E w \in WriteIDs : requests[a][w] = "running") => (a = attempt /\ status = "loading")

NoReentry == \A a \in 1..(attempt - 1) : results[a] # "none"

PartialFailureIsUnknown ==
    \A a \in AttemptIDs :
        (results[a] # "none" /\ failureResults[a] /\ requests[a][1] = "ok" /\ requests[a][2] = "rejected") => results[a] = "unknown"

FailureAfterPossibleWriteIsUnknown ==
    \A a \in AttemptIDs :
        (results[a] # "none" /\ failureResults[a] /\ (\E w \in WriteIDs : requests[a][w] \in {"ok", "unknown"})) => results[a] = "unknown"

PartialFailureWitnessAbsent ==
    ~ (\E a \in AttemptIDs :
        results[a] = "unknown" /\ successThenReject[a])

Spec == Init /\ [][Next]_vars
=============================================================================
