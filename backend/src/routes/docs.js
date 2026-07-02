import express from 'express';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'AI Candidate Discovery API',
    version: '1.0.0',
    description: 'API documentation for the candidate discovery backend.',
  },
  servers: [{ url: '/api' }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login recruiter',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated successfully' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register recruiter',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/upload': {
      post: {
        summary: 'Upload resumes',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  resumes: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Resumes uploaded and parsed' },
          '400': { description: 'Resume file required' },
        },
      },
    },
    '/search': {
      post: {
        summary: 'Semantic candidate search',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  filters: { type: 'object' },
                  limit: { type: 'integer', default: 20 },
                },
                required: ['query'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Search results returned' },
        },
      },
    },
    '/rank': {
      post: {
        summary: 'Rank candidates for a job',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  candidateIds: { type: 'array', items: { type: 'string' } },
                },
                required: ['jobId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Candidates ranked' },
        },
      },
    },
    '/compare': {
      post: {
        summary: 'Compare multiple candidates',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateIds: { type: 'array', items: { type: 'string' } },
                  jobId: { type: 'string' },
                },
                required: ['candidateIds'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Candidate comparison created' },
        },
      },
    },
    '/interview/generate': {
      post: {
        summary: 'Generate interview questions',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  jobId: { type: 'string' },
                  difficulty: { type: 'string', default: 'medium' },
                  count: { type: 'integer', default: 10 },
                  categories: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  language: { type: 'string', default: 'en' },
                },
                required: ['candidateId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Interview questions generated' },
        },
      },
    },
    '/fraud/analyze': {
      post: {
        summary: 'Analyze resume fraud risk',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                },
                required: ['candidateId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Fraud analysis returned' },
        },
      },
    },
    '/insights/skill-gap': {
      post: {
        summary: 'Calculate candidate skill gap for a job',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  jobId: { type: 'string' },
                  requiredSkills: { type: 'array', items: { type: 'string' } },
                  preferredSkills: { type: 'array', items: { type: 'string' } },
                },
                required: ['candidateId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Skill gap analysis returned' },
        },
      },
    },
    '/insights/email': {
      post: {
        summary: 'Generate recruiter outreach email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  jobId: { type: 'string' },
                  tone: { type: 'string' },
                },
                required: ['candidateId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Email draft generated' },
        },
      },
    },
    '/insights/resume-suggestions': {
      post: {
        summary: 'Suggest resume improvements',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  resumeId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Resume improvement suggestions returned' },
        },
      },
    },
    '/insights/linkedin-analyze': {
      post: {
        summary: 'Analyze LinkedIn profile text for recruiter outreach',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  profileUrl: { type: 'string' },
                  profileText: { type: 'string' },
                },
                required: ['profileUrl'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'LinkedIn profile analysis returned' },
        },
      },
    },
    '/insights/chat': {
      post: {
        summary: 'Chat with candidate profile assistant',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  message: { type: 'string' },
                },
                required: ['message'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Candidate chat answer returned' },
        },
      },
    },
  },
};

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument));

export default router;
