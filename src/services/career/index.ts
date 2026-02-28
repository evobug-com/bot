// Career system - RPG-style career selection that influences activity weights

export { Career, CAREER_INFO, DEFAULT_WEIGHTS } from "./types";
export type { CareerType, CareerInfo, CategoryWeights } from "./types";

export { CAREER_WEIGHTS, getCategoryWeight, getCareerWeights } from "./weights";

export {
	getUserCareer,
	getUserCareerType,
	setUserCareer,
	hasSelectedCareer,
	getCareerStats,
} from "./storage";
export type { UserCareer } from "./storage";
