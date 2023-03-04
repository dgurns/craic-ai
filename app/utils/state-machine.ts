import { createMachine } from 'xstate';

export const initStateMachine = (initialState: string) =>
	createMachine(
		{
			id: 'state-machine',
			initial: initialState,
			states: {
				eventCreated: {
					on: {
						CHECK_AVAILABILITY: 'checkingAvailability',
					},
				},
				checkingAvailability: {
					on: {
						GOT_AVAILABILITY_FROM_EVERYONE: 'finalizingDate',
					},
				},
				finalizingDate: { on: { DATE_FINALIZED: 'sendingFinalizedDate' } },
				sendingFinalizedDate: { on: { FINALIZED_DATE_SENT: 'finalized' } },
				finalized: { type: 'final' },
			},
		},
		{
			guards: {
				gotAvailabilityFromEveryone: (context, event) => {
					return true;
				},
			},
		}
	);
