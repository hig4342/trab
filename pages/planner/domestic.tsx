import * as React from 'react'
import axios from 'axios'
import { NextPage } from 'next'
import dynamic from 'next/dynamic'
import { Board, Planner, Country, Theme } from 'type'
import { RadioChangeEvent } from 'antd/lib/radio/interface'
import { CheckboxValueType } from 'antd/lib/checkbox/Group'
import FilterBox from '@components/FilterBox'
import PlannerList from '@components/PlannerList'
import Banner from '@components/Banner'
import '@assets/Planner.less'

const NoticeSwiper = dynamic(
  () => import('@components/NoticeSwiper'),
  { ssr: false }
)

const baseUrl = process.env.NODE_ENV === 'production' ? 'https://trab.co.kr' : ''

type Props = {
  advertisements: Board[];
  planners: Planner[];
  countries: Country[];
  themes: Theme[];
}

const Domestic_Planner: NextPage<Props> = ({ advertisements, planners, countries, themes })=> {

  const [country, setCountry] = React.useState(0)
  const [city, setCity] = React.useState<Array<CheckboxValueType>>([])
  const [theme, setTheme] = React.useState<Array<CheckboxValueType>>([])

  const handleCountry = (e: RadioChangeEvent) => {
    setCountry(e.target.value)
    setCity([])
  }

  const handleCity = (checkedValues: CheckboxValueType[]) => {
    setCity(checkedValues)
  }

  const handleTheme = (checkedValues: CheckboxValueType[]) => {
    setTheme(checkedValues)
  }

  const addCity = (value: number) => {
    let checkedCity = city.concat(value);
    setCity(checkedCity)
  }

  const deleteCity = (value: number) => {
    let checkedCity = city.filter(item => item !== value);
    setCity(checkedCity)
  }

  return (
    <div className='planner_list' style={{width: '100%'}}>
      <Banner region='domestic'/>
      <NoticeSwiper items={advertisements} inline/>
      <div className='new-planner'>
        <FilterBox
          items={countries}
          themes={themes}
          country={country}
          handleCountry={handleCountry}
          city={city}
          handleCity={handleCity}
          theme={theme}
          handleTheme={handleTheme}
          addCity={addCity}
          deleteCity={deleteCity}
        />
        <PlannerList items={planners} country={country} city={city} themes={theme}/>
      </div>
    </div>
  )
}

Domestic_Planner.getInitialProps = async () => {
  const advertisements = await axios.get(baseUrl + '/api/boards/advertisements?region=2')
  const planner = await axios.get(baseUrl + '/api/planners/domestic')
  const country = await axios.get(baseUrl + '/api/countries')
  const city = await axios.get(baseUrl + '/api/cities')
  const theme = await axios.get(baseUrl + '/api/themes')
  return {
    advertisements: advertisements.data,
    planners: planner.data,
    countries: country.data,
    cities: city.data,
    themes: theme.data,
  }
}

export default Domestic_Planner