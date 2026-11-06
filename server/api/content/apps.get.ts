import { defineEventHandler } from 'h3'
import { listPublishedApps } from '../../utils/content-repo'
import { readPublic } from '../../utils/db'

export default defineEventHandler((event) => readPublic(event, listPublishedApps))
