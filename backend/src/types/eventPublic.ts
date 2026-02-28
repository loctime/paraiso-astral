// EventPublic type for public API responses
export interface EventPublic {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  startAt: Date;
  endAt: Date | null;
  venue: string;
  city: string | null;
  status: import('@prisma/client').EventStatus;
  organization: {
    id: string;
    name: string;
  };
}

export interface EventsQueryParams {
  status?: string;
  organizationId?: string;
  upcoming?: string;
  page?: string;
  limit?: string;
}

export interface EventsResponse {
  data: EventPublic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
