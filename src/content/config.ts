import { defineCollection, z } from 'astro:content';

const discourses = defineCollection({});
const hh = defineCollection({});
const likutayExtras = defineCollection({});
const lmComplete = defineCollection({});
const outpouring = defineCollection({});
const shivchay = defineCollection({});
const stories = defineCollection({});
const teachings = defineCollection({});
const torahs = defineCollection({});

export const collections = {
  'discourses': discourses,
  'hh': hh,
  'likutay-extras': likutayExtras,
  'lm-complete': lmComplete,
  'outpouring': outpouring,
  'shivchay': shivchay,
  'stories': stories,
  'teachings': teachings,
  'torahs': torahs,
};
