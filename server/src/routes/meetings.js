const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('meeting', {
  searchFields: ['title','description'],
  include: { attendees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }, agendaItems: true, decisions: true, actionItems: true },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
