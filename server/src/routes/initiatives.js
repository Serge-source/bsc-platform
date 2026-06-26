const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('initiative', {
  searchFields: ['name','description'],
  include: { milestones: true, tasks: { take: 5 }, owner: { select: { id: true, firstName: true, lastName: true } } },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
