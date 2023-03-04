import { createMachine } from 'xstate';

export const stateMachine = createMachine(
	{
		id: 'state-machine',
		initial: 'eventCreated',
		states: {
			eventCreated: {
				on: {
					CHECK_AVAILABILITY: 'checkingAvailability',
				},
			},
			checkingAvailability: {
				on: {
					GOT_AVAILABILITY_RESPONSE: [
						{
							cond: 'gotAvailabilityFromEveryone',
							target: 'finalizingDate',
						},
					],
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
