const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('task', {
  searchFields: ['title','description'],
  include: { assignee: { select: { id: true, firstName: true, lastName: true } }, children: true, comments: true },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
