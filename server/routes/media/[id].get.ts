import { defineEventHandler } from 'h3'
import { serveMedia } from '../../utils/media'

export default defineEventHandler((event) => serveMedia(event))
