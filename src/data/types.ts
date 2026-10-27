import { departmentDetailsByRange } from './dashboard'

export type DepartmentDetail = (typeof departmentDetailsByRange)['30d'][string]
