import api from "./api";

export const createTicket = (payload) => api.post("/support/tickets", payload);
export const myTickets = () => api.get("/support/tickets/my");
export const getTicket = (id) => api.get(`/support/tickets/${id}`);
export const addTicketMessage = (id, payload) =>
  api.post(`/support/tickets/${id}/messages`, payload);
