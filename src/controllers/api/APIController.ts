import { ParameterizedContext } from 'koa'
import { IRouterParamContext } from 'koa-router'
import lodash from 'lodash'

import { Student } from '../../../db/entity/Student'
import { Students, Suspensions, Teachers, TeachesRepo } from '../../../db/repository/Repository'
import { In } from '../../../db/Wrapper'
import { router } from '../../app/config/Spring'
import { _200_OKAY, _204_NO_CONTENT } from '../../consts/StatusCodes'
import { extractMentionedEmails } from '../../utils/Util'
import { commonStudents, suspendStudent } from './APIServices'

export type CreateStudent = Pick<Student, 'first_name' | 'last_name' | 'email'>
export type StudentResponse = Omit<Student, 'id' | 'created_date' | 'updated_date' | 'teaches_by'>

type APIRegisterReq = {
  teacher: string
  students: string[]
}
router.post('/api/register', async (ctx) => {
  const body: APIRegisterReq = ctx.request.body

  const teacher = await Teachers.findOneOrFail({ where: { email: body } })
  const students = await Students.findInEmailOrFail(body.students)
  await TeachesRepo.registerStudentsToTeachers(students, teacher)

  ctx.status = _204_NO_CONTENT
})

type APICommonstudentsReq = {
  teacher: string | string[]
}
type APICommonStudentsRes = {
  students: string[]
}
router.get('/api/commonstudents', async (ctx) => {
  const body: APICommonstudentsReq = ctx.query
  const emails = typeof body.teacher === 'string' ? [body.teacher] : body.teacher

  const teachers = await Teachers.findInEmailOrFail(emails)
  const common = await commonStudents(teachers)

  ctx.status = _200_OKAY
  ctx.body = {
    students: common.map((it) => it.email),
  } as APICommonStudentsRes
})

type APISuspendReq = { student: string }
router.post('/api/suspend', async (ctx) => {
  const body: APISuspendReq = ctx.request.body

  const student = await Students.findOneOrFail({ where: { email: body.student } })
  await suspendStudent(student)

  ctx.status = _204_NO_CONTENT
})

type APIRetrievefornotificationsReq = { teacher: string; notification: string }
type APIRetrievefornotificationsRes = { recipients: string[] }
router.post('/api/retrievefornotifications', async (ctx) => {
  const req: APIRetrievefornotificationsReq = ctx.request.body

  const teacherStudents = await Teachers.findStudents(req.teacher)
  const mentionedStudents = await Students.findInEmail(extractMentionedEmails(req.notification))
  const allStudents = lodash.uniqBy([...teacherStudents, ...mentionedStudents], 'id')

  const suspended = await Suspensions.find({ where: { student: In(allStudents.map((it) => it.id)), active: true } })
  const suspendedStudents = suspended.map((it) => it.student)

  const whitelistStudents = allStudents.filter((it) => !suspendedStudents.some((s) => s.id === it.id))

  ctx.status = _200_OKAY
  ctx.body = {
    recipients: whitelistStudents.map((it) => it.email),
  } as APIRetrievefornotificationsRes
})
