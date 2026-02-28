import type { ActivityCategory, StoryCategory } from "../../commands/work";

/** Available career types */
export const Career = {
	CLERK: "clerk",
	DEVELOPER: "developer",
	SALESPERSON: "salesperson",
	ADVENTURER: "adventurer",
	SHADOW: "shadow",
} as const;

export type CareerType = (typeof Career)[keyof typeof Career];

/** Career metadata for display */
export interface CareerInfo {
	id: CareerType;
	name: string;
	czechName: string;
	emoji: string;
	description: string;
	czechDescription: string;
}

/** Career definitions with localization */
export const CAREER_INFO: Record<CareerType, CareerInfo> = {
	[Career.CLERK]: {
		id: Career.CLERK,
		name: "Clerk",
		czechName: "Úředník",
		emoji: "🏛️",
		description: "Office work, bureaucracy, meetings",
		czechDescription: "Kancelářská práce, byrokracie, schůzky",
	},
	[Career.DEVELOPER]: {
		id: Career.DEVELOPER,
		name: "Developer",
		czechName: "Programátor",
		emoji: "💻",
		description: "Coding, debugging, tech activities",
		czechDescription: "Programování, ladění, technické aktivity",
	},
	[Career.SALESPERSON]: {
		id: Career.SALESPERSON,
		name: "Salesperson",
		czechName: "Obchodník",
		emoji: "💼",
		description: "Client meetings, negotiations, business",
		czechDescription: "Schůzky s klienty, vyjednávání, obchod",
	},
	[Career.ADVENTURER]: {
		id: Career.ADVENTURER,
		name: "Adventurer",
		czechName: "Dobrodruh",
		emoji: "🎲",
		description: "Variety of activities, more stories",
		czechDescription: "Různé aktivity, více příběhů",
	},
	[Career.SHADOW]: {
		id: Career.SHADOW,
		name: "Shadow",
		czechName: "Stínový",
		emoji: "🌑",
		description: "Morally gray choices, theft stories",
		czechDescription: "Morálně šedé volby, příběhy o krádežích",
	},
};

/** Weight configuration for activity categories per career */
export type CategoryWeights = Record<ActivityCategory | StoryCategory, number>;

/** Default weights (equal distribution) */
export const DEFAULT_WEIGHTS: CategoryWeights = {
	"work:office": 1,
	"work:dev": 1,
	"work:misc": 1,
	"work:community": 1,
	"story:work": 1,
	"story:crime": 1,
	"story:adventure": 1,
};
