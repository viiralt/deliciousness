import '../sass/style.scss';
import autocomplete from './modules/autocomplete';
import { $, $$ } from './modules/bling';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

autocomplete( $('#address'), $('#lat'), $('#lng'));

typeAhead ( $('.search') );

makeMap( $('#map') );

const heartForms = $$('form.heart');

heartForms.on('submit', ajaxHeart);


