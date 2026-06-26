const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('strategicObjective', {
  searchFields: ['name','description'],
  include: { theme: true, perspective: true, kpis: true, causes: true, effects: true },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
