import { createMachine } from 'xstate';

export const stateMachine = createMachine(
	{
		id: 'state-machine',
		initial: 'readyToPlan',
		states: {
			readyToPlan: {
				on: {
					INVITEES_CONTACTED_FOR_AVAILABILITY: 'checkingAvailability',
				},
			},
			checkingAvailability: {
				on: {
					GOT_AVAILABILITY_RESPONSE: [
						{
							cond: 'gotAvailabilityFromEveryone',
							target: 'finalizingTime',
						},
					],
				},
			},
			finalizingTime: { on: { TIME_FINALIZED: 'sendingInvites' } },
			sendingInvites: { on: { INVITES_SENT: 'finalized' } },
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
